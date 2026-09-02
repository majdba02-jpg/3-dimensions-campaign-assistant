Option Explicit

Dim shell, fso, projectDir, desktop, shortcutPath, shortcut

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktop = shell.SpecialFolders("Desktop")
shortcutPath = desktop & "\3 Dimensions Dashboard.lnk"

Set shortcut = shell.CreateShortcut(shortcutPath)

shortcut.TargetPath = shell.ExpandEnvironmentStrings("%WINDIR%\System32\wscript.exe")
shortcut.Arguments = """" & projectDir & "\START 3D DASHBOARD.vbs"""
shortcut.WorkingDirectory = projectDir
shortcut.IconLocation = projectDir & "\dashboard_transparent.ico,0"
shortcut.Description = "Launch 3 Dimensions Campaign Assistant"

shortcut.Save

MsgBox "3 Dimensions Dashboard shortcut created on the Desktop.", 64, "Setup Complete"