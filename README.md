# node-red-contrib-pubsub

Provided publish/subscribe frame work with nodered.  This allows for complete independence of development between flows and allowing dynamic growth.  Helpful with complex flows ofver

------------------------------------------------------------

# Publish

Simply publishes a message to the message hub using a topic which can be predefined or used topic of message.

------------------------------------------------------------

# Subscribe

Registers interest in a topic.
More than one node can register an interest.
Message can be cloned to ensure not impacted by other subscribers.
Subscriber nodes can be pooled to the one id for a topic leaf so they round robin so only one processes a message.

------------------------------------------------------------

# Possible Future Improvements

* Multiple topics for a subscriber / publisher
* publisher calculate topic
* Pause/restart a subscriber

------------------------------------------------------------

# Install

Run the following command in the root directory of your Node-RED install or via GUI install

	npm install node-red-contrib-pubsub

------------------------------------------------------------

# Version


0.0.1 Initial release

# Author

[Peter Prib][3]

[1]: http://nodered.org "node-red home page"

[2]: https://www.npmjs.com/package/node-red-contrib-pubsub "source code"

[3]: https://github.com/peterprib "base github"
