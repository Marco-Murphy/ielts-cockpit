' Double-click launcher for IELTS Cockpit on Windows.
' Starts the local Node server only when needed, then opens the default browser.
Option Explicit

Dim fso, shell, browser, projectRoot, nodePath, command, attempt
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
Set browser = CreateObject("Shell.Application")
projectRoot = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))

Function IsReady()
  On Error Resume Next
  Dim request
  IsReady = False
  Set request = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  request.setTimeouts 400, 400, 400, 900
  request.open "GET", "http://127.0.0.1:3000/", False
  request.send
  If Err.Number = 0 Then
    If request.status = 200 Then
      IsReady = (InStr(1, request.responseText, "IELTS Cockpit", vbTextCompare) > 0)
    End If
  End If
  Err.Clear
  On Error GoTo 0
End Function

If Not IsReady() Then
  nodePath = "node.exe"
  command = """" & nodePath & """ """ & projectRoot & "\server\index.js" & """"
  On Error Resume Next
  shell.Run command, 0, False
  If Err.Number <> 0 Then
    MsgBox "IELTS Cockpit could not start. Check that Node.js is installed.", vbExclamation, "IELTS Cockpit"
    WScript.Quit 1
  End If
  Err.Clear
  On Error GoTo 0

  For attempt = 1 To 40
    WScript.Sleep 300
    If IsReady() Then Exit For
  Next
End If

If IsReady() Then
  browser.ShellExecute "http://localhost:3000/#/dashboard", "", "", "open", 1
Else
  MsgBox "IELTS Cockpit did not become ready. Port 3000 may be occupied, or dependencies may be missing.", vbExclamation, "IELTS Cockpit"
End If
