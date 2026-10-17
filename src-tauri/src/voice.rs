//! Commande vocale (ordinateur uniquement), 100 % locale :
//!
//! micro (cpal) → détection de la voix (énergie du son) → phrases → Whisper, 1re passe en français
//! avec la position de chaque mot → l'interface analyse la phrase (mots-clés) → 2e passe sur les
//! seuls morceaux de texte libre (titre, contenu…), dans leur vraie langue (français, anglais ou espagnol).
//!
//! Le son n'est jamais enregistré sur le disque : les dernières phrases restent quelques instants en
//! mémoire (pour la 2e passe), puis sont oubliées.

use std::collections::VecDeque;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

const RATE: usize = 16_000;
/// 30 ms de son à 16 kHz.
const FRAME: usize = 480;
/// Silence qui termine une phrase.
const END_SILENCE: Duration = Duration::from_millis(1_000);
/// Silence après une phrase : l'interface termine la commande commencée.
const PAUSE_SILENCE: Duration = Duration::from_millis(4_000);
/// Plus rien dit pendant ce temps : le micro se coupe tout seul.
const AUTO_OFF: Duration = Duration::from_secs(30);
/// Une phrase plus longue est coupée (limite de Whisper : 30 s).
const MAX_UTTERANCE_S: f32 = 28.0;
/// Phrases gardées en mémoire pour la 2e passe.
const KEEP_UTTERANCES: usize = 12;

/// Mots que Whisper doit s'attendre à entendre (meilleure reconnaissance des mots-clés).
const PROMPT_FR: &str = "My Agenda, crée-moi une note. Titre : courses. Contenu : pain, lait. Stop. Nouvelle tâche, priorité haute, pour demain à 14 h. Nouvel évènement, durée 1 heure, lieu. Éteins-toi.";

// ── Modèles ──────────────────────────────────────────────────────────────────

struct ModelInfo {
    id: &'static str,
    label: &'static str,
    file: &'static str,
    url: &'static str,
    size_mb: u32,
}

/// Modèles multilingues (français, anglais, espagnol…), version allégée « q5_1 ».
const MODELS: [ModelInfo; 2] = [
    ModelInfo {
        id: "base",
        label: "Rapide (recommandé)",
        file: "ggml-base-q5_1.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin",
        size_mb: 57,
    },
    ModelInfo {
        id: "small",
        label: "Précis (plus lent)",
        file: "ggml-small-q5_1.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin",
        size_mb: 181,
    },
];

fn model(id: &str) -> Result<&'static ModelInfo, String> {
    MODELS.iter().find(|m| m.id == id).ok_or_else(|| format!("Modèle inconnu : {id}"))
}

fn models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("models");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Dossier des modèles inaccessible : {e}"))?;
    Ok(dir)
}

fn model_path(app: &AppHandle, m: &ModelInfo) -> Result<PathBuf, String> {
    Ok(models_dir(app)?.join(m.file))
}

/// Un fichier plus petit que 80 % de la taille attendue est un téléchargement incomplet.
fn model_ready(app: &AppHandle, m: &ModelInfo) -> bool {
    model_path(app, m)
        .ok()
        .and_then(|p| std::fs::metadata(p).ok())
        .map(|md| md.len() > (m.size_mb as u64) * 1_000_000 * 8 / 10)
        .unwrap_or(false)
}

// ── État partagé ─────────────────────────────────────────────────────────────

struct Session {
    stop: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct VoiceState {
    context: Mutex<Option<(String, Arc<WhisperContext>)>>,
    session: Mutex<Option<Session>>,
    utterances: Mutex<VecDeque<(u32, Vec<f32>)>>,
    next_id: AtomicU32,
    downloading: AtomicBool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    id: &'static str,
    label: &'static str,
    size_mb: u32,
    downloaded: bool,
}

#[derive(Serialize, Clone)]
struct WordOut {
    text: String,
    start: f32,
    end: f32,
}

#[derive(Serialize, Clone)]
struct UtteranceOut {
    id: u32,
    text: String,
    words: Vec<WordOut>,
    duration: f32,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RangeOut {
    text: String,
    lang: String,
}

#[derive(Serialize, Clone)]
struct DownloadProgress {
    model: &'static str,
    downloaded: u64,
    total: u64,
}

#[derive(Serialize, Clone)]
struct PhaseOut {
    phase: &'static str,
    reason: Option<String>,
}

fn emit_phase(app: &AppHandle, phase: &'static str, reason: Option<&str>) {
    let _ = app.emit("voice://state", PhaseOut { phase, reason: reason.map(String::from) });
}

fn threads() -> i32 {
    let n = thread::available_parallelism().map(|n| n.get()).unwrap_or(2);
    n.saturating_sub(1).clamp(1, 6) as i32
}

// ── Commandes ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn voice_models(app: AppHandle) -> Vec<ModelStatus> {
    MODELS
        .iter()
        .map(|m| ModelStatus { id: m.id, label: m.label, size_mb: m.size_mb, downloaded: model_ready(&app, m) })
        .collect()
}

/// Télécharge un modèle (une seule fois) ; progression envoyée via `voice://download`.
#[tauri::command]
pub async fn voice_download_model(app: AppHandle, state: State<'_, VoiceState>, id: String) -> Result<(), String> {
    let m = model(&id)?;
    if state.downloading.swap(true, Ordering::SeqCst) {
        return Err("Un téléchargement est déjà en cours.".into());
    }
    let app2 = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || download(&app2, m))
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| r);
    state.downloading.store(false, Ordering::SeqCst);
    result
}

fn download(app: &AppHandle, m: &'static ModelInfo) -> Result<(), String> {
    let path = model_path(app, m)?;
    let part = path.with_extension("bin.part");
    let mut response = ureq::get(m.url)
        .call()
        .map_err(|e| format!("Téléchargement impossible (connexion Internet ?) : {e}"))?;
    let total = response
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(m.size_mb as u64 * 1_000_000);
    let mut reader = response.body_mut().as_reader();
    let mut file = std::fs::File::create(&part).map_err(|e| format!("Écriture impossible : {e}"))?;
    let mut buf = vec![0u8; 256 * 1024];
    let mut done: u64 = 0;
    let mut last = Instant::now();
    loop {
        let n = reader.read(&mut buf).map_err(|e| format!("Téléchargement interrompu : {e}"))?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| format!("Écriture impossible : {e}"))?;
        done += n as u64;
        if last.elapsed() > Duration::from_millis(200) {
            let _ = app.emit("voice://download", DownloadProgress { model: m.id, downloaded: done, total });
            last = Instant::now();
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    drop(file);
    if done < (m.size_mb as u64) * 1_000_000 * 8 / 10 {
        let _ = std::fs::remove_file(&part);
        return Err("Fichier reçu incomplet : réessaie.".into());
    }
    std::fs::rename(&part, &path).map_err(|e| format!("Enregistrement du modèle impossible : {e}"))?;
    let _ = app.emit("voice://download", DownloadProgress { model: m.id, downloaded: done, total: done });
    Ok(())
}

fn load_context(state: &VoiceState, app: &AppHandle, id: &str) -> Result<Arc<WhisperContext>, String> {
    let mut slot = state.context.lock().map_err(|e| e.to_string())?;
    if let Some((loaded, ctx)) = slot.as_ref() {
        if loaded == id {
            return Ok(ctx.clone());
        }
    }
    let m = model(id)?;
    if !model_ready(app, m) {
        return Err("model-missing".into());
    }
    let path = model_path(app, m)?;
    let ctx = WhisperContext::new_with_params(path.to_string_lossy().as_ref(), WhisperContextParameters::default())
        .map_err(|e| format!("Modèle illisible ({e}) : supprime-le dans Réglages et télécharge-le à nouveau."))?;
    let ctx = Arc::new(ctx);
    *slot = Some((id.to_string(), ctx.clone()));
    Ok(ctx)
}

#[tauri::command]
pub fn voice_is_active(state: State<'_, VoiceState>) -> bool {
    state.session.lock().map(|s| s.is_some()).unwrap_or(false)
}

/// Allume le micro et l'écoute. Erreur « model-missing » si le modèle n'est pas encore téléchargé.
#[tauri::command]
pub async fn voice_start(app: AppHandle, model_id: String) -> Result<(), String> {
    let app2 = app.clone();
    tauri::async_runtime::spawn_blocking(move || start(&app2, &model_id))
        .await
        .map_err(|e| e.to_string())?
}

fn start(app: &AppHandle, model_id: &str) -> Result<(), String> {
    let state = app.state::<VoiceState>();
    if state.session.lock().map_err(|e| e.to_string())?.is_some() {
        return Ok(());
    }
    emit_phase(app, "loading", None);
    let ctx = match load_context(&state, app, model_id) {
        Ok(c) => c,
        Err(e) => {
            emit_phase(app, "off", Some(&e));
            return Err(e);
        }
    };

    let stop = Arc::new(AtomicBool::new(false));
    let (audio_tx, audio_rx) = mpsc::channel::<Vec<f32>>();
    let (utt_tx, utt_rx) = mpsc::channel::<Vec<f32>>();
    let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();

    // 1. Micro : le flux audio doit vivre dans son propre fil (non transférable sur macOS).
    {
        let stop = stop.clone();
        thread::spawn(move || capture(audio_tx, stop, ready_tx));
    }
    match ready_rx.recv_timeout(Duration::from_secs(5)) {
        Ok(Ok(())) => {}
        Ok(Err(e)) => {
            emit_phase(app, "off", Some(&e));
            return Err(e);
        }
        Err(_) => {
            stop.store(true, Ordering::SeqCst);
            let e = "Le micro ne répond pas.".to_string();
            emit_phase(app, "off", Some(&e));
            return Err(e);
        }
    }

    // 2. Détection de la voix → phrases.
    {
        let app = app.clone();
        let stop = stop.clone();
        thread::spawn(move || detect(app, audio_rx, utt_tx, stop));
    }
    // 3. Transcription (1re passe).
    {
        let app = app.clone();
        let stop = stop.clone();
        thread::spawn(move || transcribe_loop(app, ctx, utt_rx, stop));
    }

    *state.session.lock().map_err(|e| e.to_string())? = Some(Session { stop });
    emit_phase(app, "listening", None);
    Ok(())
}

/// Éteint le micro (bouton, raccourci, « éteins-toi » ou silence prolongé).
#[tauri::command]
pub fn voice_stop(app: AppHandle) {
    stop_session(&app, None);
}

fn stop_session(app: &AppHandle, reason: Option<&str>) {
    let state = app.state::<VoiceState>();
    let session = state.session.lock().ok().and_then(|mut s| s.take());
    if let Some(s) = session {
        s.stop.store(true, Ordering::SeqCst);
    }
    if let Ok(mut u) = state.utterances.lock() {
        u.clear();
    }
    emit_phase(app, "off", reason);
}

/// 2e passe : retranscrit un morceau d'une phrase (un champ) dans sa langue, parmi français / anglais / espagnol.
#[tauri::command]
pub async fn voice_transcribe_range(app: AppHandle, id: u32, start: f32, end: f32) -> Result<RangeOut, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<VoiceState>();
        let audio = {
            let list = state.utterances.lock().map_err(|e| e.to_string())?;
            list.iter().find(|(i, _)| *i == id).map(|(_, a)| a.clone())
        }
        .ok_or("Phrase expirée")?;
        let ctx = {
            let slot = state.context.lock().map_err(|e| e.to_string())?;
            slot.as_ref().map(|(_, c)| c.clone()).ok_or("Modèle non chargé")?
        };
        let from = (((start - 0.15).max(0.0)) * RATE as f32) as usize;
        let to = (((end + 0.25) * RATE as f32) as usize).min(audio.len());
        if to <= from || to - from < RATE / 4 {
            return Ok(RangeOut { text: String::new(), lang: "fr".into() });
        }
        let slice = &audio[from..to];
        let lang = detect_language(&ctx, slice).unwrap_or("fr");
        let text = run_whisper(&ctx, slice, lang, false)?.0;
        Ok(RangeOut { text, lang: lang.into() })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ── Micro ────────────────────────────────────────────────────────────────────

fn capture(tx: Sender<Vec<f32>>, stop: Arc<AtomicBool>, ready: Sender<Result<(), String>>) {
    let result = (|| -> Result<cpal::Stream, String> {
        let host = cpal::default_host();
        let device = host.default_input_device().ok_or(
            "Aucun micro trouvé. Branche un micro ou vérifie Paramètres → Confidentialité → Microphone.",
        )?;
        let config = device.default_input_config().map_err(|e| format!("Micro inaccessible : {e}"))?;
        let rate = config.sample_rate() as usize;
        let channels = config.channels() as usize;
        let mut resampler = Resampler::new(rate);
        let err_fn = |e| eprintln!("[Voix] erreur du flux audio : {e}");
        macro_rules! build {
            ($t:ty, $conv:expr) => {{
                let tx = tx.clone();
                device.build_input_stream(
                    config.clone().into(),
                    move |data: &[$t], _: &_| {
                        let mono: Vec<f32> = data
                            .chunks(channels)
                            .map(|c| c.iter().map(|&s| $conv(s)).sum::<f32>() / channels as f32)
                            .collect();
                        let _ = tx.send(resampler.push(&mono));
                    },
                    err_fn,
                    None,
                )
            }};
        }
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => build!(f32, |s: f32| s),
            cpal::SampleFormat::I16 => build!(i16, |s: i16| s as f32 / 32768.0),
            cpal::SampleFormat::U16 => build!(u16, |s: u16| (s as f32 - 32768.0) / 32768.0),
            cpal::SampleFormat::I32 => build!(i32, |s: i32| s as f32 / 2_147_483_648.0),
            other => return Err(format!("Format de micro non pris en charge : {other:?}")),
        }
        .map_err(|e| format!("Micro inaccessible (autorisation refusée ?) : {e}"))?;
        stream.play().map_err(|e| format!("Impossible de démarrer le micro : {e}"))?;
        Ok(stream)
    })();
    match result {
        Ok(stream) => {
            let _ = ready.send(Ok(()));
            while !stop.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_millis(50));
            }
            drop(stream);
        }
        Err(e) => {
            let _ = ready.send(Err(e));
        }
    }
}

/// Conversion vers 16 kHz : moyenne des échantillons de chaque intervalle (suffisant pour la voix).
struct Resampler {
    ratio: f64,
    pos: f64,
    pending: Vec<f32>,
}

impl Resampler {
    fn new(rate: usize) -> Self {
        Self { ratio: rate as f64 / RATE as f64, pos: 0.0, pending: Vec::new() }
    }

    fn push(&mut self, input: &[f32]) -> Vec<f32> {
        if (self.ratio - 1.0).abs() < 1e-9 {
            return input.to_vec();
        }
        self.pending.extend_from_slice(input);
        let mut out = Vec::with_capacity((input.len() as f64 / self.ratio) as usize + 1);
        while self.pos + self.ratio <= self.pending.len() as f64 {
            let a = self.pos as usize;
            let b = ((self.pos + self.ratio) as usize).max(a + 1).min(self.pending.len());
            let sum: f32 = self.pending[a..b].iter().sum();
            out.push(sum / (b - a) as f32);
            self.pos += self.ratio;
        }
        let consumed = self.pos as usize;
        self.pending.drain(..consumed);
        self.pos -= consumed as f64;
        out
    }
}

// ── Détection de la voix ─────────────────────────────────────────────────────

fn rms(frame: &[f32]) -> f32 {
    (frame.iter().map(|s| s * s).sum::<f32>() / frame.len() as f32).sqrt()
}

fn detect(app: AppHandle, rx: Receiver<Vec<f32>>, tx: Sender<Vec<f32>>, stop: Arc<AtomicBool>) {
    let mut buf: Vec<f32> = Vec::new();
    let mut noise = 0.004f32;
    let mut pre_roll: VecDeque<f32> = VecDeque::with_capacity(RATE / 3);
    let mut speech: Vec<f32> = Vec::new();
    let mut in_speech = false;
    let mut loud_frames = 0;
    let mut silent_since: Option<Instant> = None;
    let mut last_voice = Instant::now();
    let mut pause_sent = true;
    let mut last_level = Instant::now();
    let mut voiced_frames = 0usize;

    while !stop.load(Ordering::SeqCst) {
        let chunk = match rx.recv_timeout(Duration::from_millis(200)) {
            Ok(c) => c,
            Err(RecvTimeoutError::Timeout) => continue,
            Err(RecvTimeoutError::Disconnected) => break,
        };
        buf.extend_from_slice(&chunk);
        while buf.len() >= FRAME {
            let frame: Vec<f32> = buf.drain(..FRAME).collect();
            let level = rms(&frame);
            let start_thr = (noise * 3.5).max(0.012);
            let keep_thr = (noise * 2.0).max(0.007);

            if last_level.elapsed() > Duration::from_millis(100) {
                let _ = app.emit("voice://level", (level * 14.0).min(1.0));
                last_level = Instant::now();
            }

            if !in_speech {
                noise = (noise * 0.97 + level * 0.03).clamp(0.001, 0.05);
                pre_roll.extend(frame.iter());
                while pre_roll.len() > RATE * 3 / 10 {
                    pre_roll.pop_front();
                }
                loud_frames = if level > start_thr { loud_frames + 1 } else { 0 };
                if loud_frames >= 3 {
                    in_speech = true;
                    voiced_frames = loud_frames;
                    speech.clear();
                    speech.extend(pre_roll.iter());
                    pre_roll.clear();
                    silent_since = None;
                    emit_phase(&app, "hearing", None);
                }
            } else {
                speech.extend_from_slice(&frame);
                if level > keep_thr {
                    silent_since = None;
                    voiced_frames += 1;
                    last_voice = Instant::now();
                } else if silent_since.is_none() {
                    silent_since = Some(Instant::now());
                }
                let too_long = speech.len() as f32 / RATE as f32 > MAX_UTTERANCE_S;
                if too_long || silent_since.map(|t| t.elapsed() >= END_SILENCE).unwrap_or(false) {
                    in_speech = false;
                    loud_frames = 0;
                    last_voice = Instant::now();
                    pause_sent = false;
                    // Moins de 0,3 s de voix : bruit (toux, clic…), ignoré.
                    if voiced_frames * FRAME >= RATE * 3 / 10 {
                        // On garde 0,3 s de silence après la dernière syllabe.
                        let tail_keep = RATE * 3 / 10;
                        let silent_len = silent_since.map(|t| (t.elapsed().as_secs_f32() * RATE as f32) as usize).unwrap_or(0);
                        let cut = speech.len().saturating_sub(silent_len.saturating_sub(tail_keep));
                        speech.truncate(cut.max(RATE / 4));
                        let _ = tx.send(std::mem::take(&mut speech));
                    } else {
                        emit_phase(&app, "listening", None);
                    }
                    silent_since = None;
                }
            }
        }
        if !in_speech {
            if !pause_sent && last_voice.elapsed() >= PAUSE_SILENCE {
                pause_sent = true;
                let _ = app.emit("voice://pause", ());
            }
            if last_voice.elapsed() >= AUTO_OFF {
                stop_session(&app, Some("silence"));
                break;
            }
        }
    }
}

// ── Transcription ────────────────────────────────────────────────────────────

/// Phrases fantômes que Whisper invente parfois sur du bruit.
fn is_hallucination(text: &str) -> bool {
    let t = text.to_lowercase();
    let t = t.trim().trim_matches(|c: char| !c.is_alphanumeric());
    t.is_empty()
        || ["amara", "sous-titr", "sous titr", "merci d'avoir regardé", "abonnez-vous", "radio-canada", "www."]
            .iter()
            .any(|p| t.contains(p))
        || t == "merci"
}

fn detect_language(ctx: &WhisperContext, audio: &[f32]) -> Option<&'static str> {
    let mut state = ctx.create_state().ok()?;
    state.pcm_to_mel(audio, threads() as usize).ok()?;
    let (_, probs) = state.lang_detect(0, threads() as usize).ok()?;
    ["fr", "en", "es"]
        .into_iter()
        .filter_map(|l| whisper_rs::get_lang_id(l).map(|id| (l, probs.get(id as usize).copied().unwrap_or(0.0))))
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(l, _)| l)
}

/// Transcrit `audio` dans la langue donnée. Avec `words`, renvoie aussi chaque mot et sa position.
fn run_whisper(ctx: &WhisperContext, audio: &[f32], lang: &str, words: bool) -> Result<(String, Vec<WordOut>), String> {
    let mut state = ctx.create_state().map_err(|e| e.to_string())?;
    let mut p = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    p.set_language(Some(lang));
    p.set_n_threads(threads());
    p.set_translate(false);
    p.set_no_context(true);
    p.set_single_segment(false);
    p.set_print_special(false);
    p.set_print_progress(false);
    p.set_print_realtime(false);
    p.set_print_timestamps(false);
    p.set_suppress_blank(true);
    p.set_suppress_nst(true);
    p.set_temperature(0.0);
    p.set_token_timestamps(words);
    if lang == "fr" {
        p.set_initial_prompt(PROMPT_FR);
    }
    // Whisper attend au moins 1 s de son : on complète par du silence.
    let mut padded;
    let input = if audio.len() < RATE + RATE / 4 {
        padded = audio.to_vec();
        padded.resize(RATE + RATE / 4, 0.0);
        &padded[..]
    } else {
        audio
    };
    state.full(p, input).map_err(|e| e.to_string())?;

    let mut text = String::new();
    let mut out: Vec<WordOut> = Vec::new();
    for i in 0..state.full_n_segments() {
        let Some(seg) = state.get_segment(i) else { continue };
        if seg.no_speech_probability() > 0.75 {
            continue;
        }
        let seg_text = seg.to_str_lossy().map(|s| s.to_string()).unwrap_or_default();
        if is_hallucination(&seg_text) {
            continue;
        }
        text.push_str(&seg_text);
        if !words {
            continue;
        }
        for k in 0..seg.n_tokens() {
            let Some(tok) = seg.get_token(k) else { continue };
            let piece = tok.to_str_lossy().map(|s| s.to_string()).unwrap_or_default();
            // Jetons spéciaux : [_BEG_], [_TT_42], <|endoftext|>…
            if piece.is_empty() || piece.starts_with("[_") || piece.starts_with("<|") {
                continue;
            }
            let data = tok.token_data();
            let (t0, t1) = (data.t0 as f32 / 100.0, data.t1 as f32 / 100.0);
            let starts_word = piece.starts_with(' ') || out.is_empty();
            if starts_word {
                out.push(WordOut { text: piece.trim().to_string(), start: t0, end: t1.max(t0) });
            } else if let Some(last) = out.last_mut() {
                last.text.push_str(&piece);
                last.end = last.end.max(t1);
            }
        }
    }
    out.retain(|w| !w.text.is_empty());
    Ok((text.trim().to_string(), out))
}

fn transcribe_loop(app: AppHandle, ctx: Arc<WhisperContext>, rx: Receiver<Vec<f32>>, stop: Arc<AtomicBool>) {
    let state_ref = app.state::<VoiceState>();
    while !stop.load(Ordering::SeqCst) {
        let audio = match rx.recv_timeout(Duration::from_millis(200)) {
            Ok(a) => a,
            Err(RecvTimeoutError::Timeout) => continue,
            Err(RecvTimeoutError::Disconnected) => break,
        };
        emit_phase(&app, "processing", None);
        let duration = audio.len() as f32 / RATE as f32;
        match run_whisper(&ctx, &audio, "fr", true) {
            Ok((text, words)) if !text.is_empty() && !words.is_empty() => {
                let id = state_ref.next_id.fetch_add(1, Ordering::SeqCst) + 1;
                if let Ok(mut list) = state_ref.utterances.lock() {
                    list.push_back((id, audio));
                    while list.len() > KEEP_UTTERANCES {
                        list.pop_front();
                    }
                }
                let _ = app.emit("voice://utterance", UtteranceOut { id, text, words, duration });
            }
            Ok(_) => {}
            Err(e) => {
                let _ = app.emit("voice://error", format!("Transcription impossible : {e}"));
            }
        }
        if !stop.load(Ordering::SeqCst) {
            emit_phase(&app, "listening", None);
        }
    }
}

// ── Raccourci clavier ────────────────────────────────────────────────────────

pub const SHORTCUT: &str = "CommandOrControl+Shift+Space";

/// Raccourci pressé (même application cachée) : l'interface allume ou éteint l'écoute.
pub fn on_shortcut(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        // Application cachée dans la zone de notification : on la montre, pour voir ce qui est entendu.
        if !w.is_visible().unwrap_or(true) {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }
    let _ = app.emit_to("main", "voice://toggle", ());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resampler_48k_vers_16k() {
        let mut r = Resampler::new(48_000);
        let out: usize = (0..10).map(|_| r.push(&vec![0.5; 4_800]).len()).sum();
        assert!((15_990..=16_000).contains(&out), "{out}");
    }

    #[test]
    fn phrases_fantomes() {
        assert!(is_hallucination("Sous-titres réalisés par la communauté d'Amara.org"));
        assert!(is_hallucination(" Merci. "));
        assert!(!is_hallucination("Crée une note, titre merci Paul"));
    }
}
