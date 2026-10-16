; Étapes ajoutées à l'installeur Windows de My Agenda (première installation ET mises à jour).

!macro NSIS_HOOK_POSTINSTALL
  ; Windows garde en cache les icônes des programmes (barre des tâches épinglée, raccourcis…)
  ; et ne les relit pas quand l'application change d'icône. On lui demande de rafraîchir :
  ; 1. « les associations / icônes ont changé » (SHCNE_ASSOCCHANGED)
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  ; 2. reconstruction du cache d'icônes de l'utilisateur
  nsExec::Exec '"$WINDIR\System32\ie4uinit.exe" -show'
  nsExec::Exec '"$WINDIR\Sysnative\ie4uinit.exe" -show'
!macroend
