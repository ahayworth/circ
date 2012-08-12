circ
====

minimal Chrome IRC client

requirements
====
* chrome dev build
* experimental APIs enabled (chrome://flags)
* patience

installation
====
* clone the repo
* visit chrome://extensions, switch to developer mode
* "Load unpacked extension" - select the directory you cloned

instructions
====
* circ only supports connecting to one server (for now)
  /connect host port nick
* this is, incidentally, the most hand-holding that circ does
* all other commands must be specified as normal IRC commands, prefixed with a /
* to change channels that you have joined, click the link at the top of the window
* if you'd like to disable nick notifications, visit the settings page
* true privmsg support is not here yet, it won't work, so don't try it

bugs
====
* there are several, see the commit logs
* please help me fix them, if you'd like
