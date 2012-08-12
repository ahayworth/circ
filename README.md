circ
====

Minimal Chrome IRC client.

requirements
====
* Chrome dev build
* Experimental APIs enabled (chrome://flags)
* Patience

installation
====
* Clone the repo
* Visit chrome://extensions, switch to developer mode
* "Load unpacked extension" - select the directory you cloned

instructions
====
The client is currently hardcoded to freenode. Edit irc.js if you want to change that. Otherwise, send a NICK and a USER command to the server when the window loads.
