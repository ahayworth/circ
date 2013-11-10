circ
====

minimal Chrome IRC client

requirements
====
* patience

installation
====
* clone the repo
* visit chrome://extensions, switch to developer mode
* "Load unpacked extension" - select the directory you cloned

instructions
====
* circ only supports connecting to one server (for now)
    <pre>/connect host port nick</pre>
* this is, incidentally, the most hand-holding that circ does
* all other commands must be specified as normal IRC commands, prefixed with a /
* to change channels that you have joined, click the link at the top of the window
* to send a private message, type
    <pre>/msg theirnick</pre>
* /part closes a private message window too
* if you'd like to disable nick notifications, visit the settings page

bugs
====
* there are several, see the commit logs
* please help me fix them, if you'd like
