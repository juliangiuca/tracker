## Tracker.js
#### A simple node app to stream a tracking pixel, giving 100ms timing resolution

This is the counterpart to [Emailer](https://github.com/juliangiuca/emailer).

This streams a unique tracking pixel - sending the next frame in a 1x1 px gif every
100 ms. It works by sending just enough valid data to make the client (browser / email client) think the connection is still active.


### Config
This will probably barf without newrelic.js. You also need to have a database set up -
the schema is in [Emailer](https://github.com/juliangiuca/emailer).

You also need to define a config/database.yml file.
As part of the deployment process, this is grabbing my secret files from BitBucket. Clearly this won't work for you.

### Tracking pixel
`/tp/<token>` Where token is a unique identifier for an email to a person.

### Status pages
`/status/db` - Give some database insight. Are we connected? Is it up?  
`/status/ping` - Is the site up?  
`/status/demo` - Stream a tracking pixel (doesn't write to the db)



### FAQ
#### Why send a frame, why not 1 byte?
It would be easy enough to make this stream 1 byte every ms, but I thought sending over
a valid gif on every interval made more sense. Both work.

#### How does it work?
This is essentially a hax around how Gif's work. They don't define how large
they are, so we can start a gif, then send over an infinite number of frames,
and the image is still valid.

#### Why is there Ruby in your Node?
Capistrano for deployment. It works. Deal with it.

### License
MIT license.
