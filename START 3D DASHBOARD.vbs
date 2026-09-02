Option Explicit

Dim shell, fso, projectDir, serverCmd, i

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

Function DashboardReady()
    On Error Resume Next

    Dim http
    Set http = CreateObject("MSXML2.XMLHTTP")

    http.Open "GET", "http://127.0.0.1:3000/api/health", False
    http.Send

    DashboardReady = (Err.Number = 0 And http.Status >= 200 And http.Status < 300)

    Err.Clear
    On Error GoTo 0
End Function

If Not fso.FolderExists(projectDir & "\node_modules") Then
    MsgBox "First-time setup is incomplete. Please run npm.cmd install first.", 48, "3 Dimensions Dashboard"
    WScript.Quit
End If

If Not fso.FileExists(projectDir & "\dist\server.cjs") Then
    MsgBox "The dashboard has not been built yet. Please run npm.cmd run build first.", 48, "3 Dimensions Dashboard"
    WScript.Quit
End If

If Not DashboardReady() Then

    serverCmd = "cmd.exe /c cd /d """ & projectDir & """ && npm.cmd start"

    ' 0 = completely hidden window
    shell.Run serverCmd, 0, False

    ' Wait up to about 15 seconds for the server
    For i = 1 To 30
        WScript.Sleep 500

        If DashboardReady() Then
            Exit For
        End If
    Next

End If

If DashboardReady() Then
    shell.Run "http://localhost:3000", 1, False
Else
    MsgBox "The dashboard server could not start.", 16, "3 Dimensions Dashboard"
End If