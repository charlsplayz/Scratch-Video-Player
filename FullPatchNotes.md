# Video Player Patch Notes
Thought I'd put all the patch notes so if anyone wants to view them, well here they are!
***
### Alpha 0.1
- Added Basic Playback with Turbowarp's Video and File Plugin.
### Alpha 0.2
- Worked with Claude to automatically crop videos
### Alpha 0.3
- (tried to) Fix a bug where the video's resolution values are two times too small when in reality the scaling was completely off
### Alpha 0.4
- Actually fixed it.
### Alpha 0.5
- Added a Play/Pause Button
### Alpha 0.6
- Worked with Claude to create a Progress Bar
***
## Alpha 1.0
- Progress Bar implemented!
### Alpha 1.1
- Fixed a bug where scrolling too fast would cause the playhead to just... return to its original position
- Fixed a bug where audio would play while scrubbing, creating a really unpleasant noise
- Fixed a bug where scrubbing while paused would restart the video.
### Alpha 1.2
- Added Audio Support!
- Changed the "Open..." option on the menu to be a dropdown list
- Planning to add support for a live waveform
### Alpha 1.2.1
- Fixed a bug not allowing Audios to Scrub properly
### Alpha 1.3
- Added a visualizer to see the length and current duration of a video/audio
### Alpha 1.3.1
- The Play/Pause button now checks every second to make sure it shows correctly
### Alpha 1.4
- Hitting the Play/Pause button when the audio/video file has ended now restarts playback
- Added a Popup that shows if a video/audio file was unable to load
- Replaced the Files popup when selecting a file with a custom one, that looks more on-brand
### Alpha 1.4.1
- Fixed a bug that made videos resume when scrubbing
- Fixed a bug where the play/pause button check would reset the variables, leading to small bugs
- Changed the checking interval from every second to a forever loop
- Fixed a bug that made the Play/Pause button show as unpaused when scrubbing
### Alpha 1.4.2
- The spacebar now can play/pause videos
- Updated the Supported Formats in the Audio Section; turns out, Tune Shark V3 does not support m4a files. Go figure.
### Alpha 1.5
- The progress bar now shows, replacing the old pen method.
- Replaced the Pen Drawing Sprite with a stretching one instead
### Alpha 1.5.1
- Fixed a bug where selecting one file format, then the other, would cause some parts of the UI to break
### Alpha 1.6
- Added YouTube Video Support
### Alpha 1.6.1
- Added Basic Multi-Video Support - It doesn't make a difference right now.
### Alpha 1.7
- Worked with Claude and added a Waveform When Audio is playing
#### Known Bugs:
 - When loading multiple videos/audios, skipping tracks refuses to work.
 - Sometimes, the waveform can spawn a bit to the right, instead of at the edge
### Alpha 1.7.1
- Fixed a bug that made it impossible to load multiple videos/audios
#### Known Bugs
 - When loading two different file formats, the previous audio was played over the existing video
### Alpha 1.7.2
- Fixed a bug that made the Playhead/progress bar not update when a track was skipped
- Fixed a bug that made the waveform generate at the end of the stage
### Alpha 1.7.3
- Added a About popup to show some information
### Alpha 1.7.4
- Fixed a bug that caused Videos to play as Audios and vice-versa
### Alpha 1.8
- Added Support for Resizing the stage, so that some UI elements of the YouTube Player aren't too compact
### Alpha 1.9
- The Audio Waveform can now show both Mono and Stereo Audio Types, with the waveform changing depending on the amound of channels
### Alpha 1.9.1
- When loading an audio, a script now checks if the audio is mono or stereo, and selects the waveform automatically
### Alpha 1.9.2
- Fixed a bug where Stereo and Mono audios wouldn't load the correct waveform
- Fixed a bug where the Waveform would generate 1 or 2 spaces to the right
### Alpha 1.9.3
- Video files can now be played as audios, showing the waveform
### Alpha 1.9.4
- Added a loop button, which can make audios and videos loop
#### Known Bugs
 - Sometimes the automatic check that runs every time a video is loaded will finish after the waveform is drawn, leading to the waveform being half mono and half stereo
 - The loop button can sometimes softlock the pause button, breaking it.
***
## Alpha 1.10
- Time Synced Lyrics are now here!
 - When clicking on the lyrics button, you can search for songs, and if they're in the database, you can have time synced lyrics on the screen. (only supported for audio files, not videos)
### Alpha 1.10.1
- Fixed some bugs (i can't remember what honestly)
- The Lyrics and Playback time now move to the menu bar (the top one) when in X2 stage size for better sizing
### Alpha 1.10.2
- Swapped the Positions of the Play and Backward Buttons to be more in line with most video players
### Alpha 1.10.3
- Fixed the positions of some buttons
### Alpha 1.10.4
- Minor Bug Fixes
### Alpha 1.10.5
- SharkPools "YouTube Operations" Extension is now providing the backend for loading YouTube Video Information
- When a Video is Loaded, The Like, Dislike, Title, and Description are automatically loaded. There is currently no way to view this information yet.
### Alpha 1.10.6
- Changed the [Open YouTube Video] Button to a pop-up, which still has the option to open a YouTube Video\
- The [Open....] Button now has 3 periods, instead of 4.
- The [Open YouTube Video] Button now has the text centered.
### Alpha 1.10.7
- The option to load a soundcloud song is now available, but non functional yet.
- Added a Popup that explains how the SoundCloud API is down
### Alpha 1.10.8
- We finally have a logo!
  - There are currently two logo variations, one based on the Windows Media Player 8 Logo, but flat, and one based on the Windows Media Player 11 Logo, but tinted orange.
- By default the Media Player 8 styled logo will show
### Alpha 1.10.9
- There is an information button that is meant to show video info, but is currently being worked on.
- The iframe extension has been replaced by the YouTube Operations Extension, full list of reasons will be documented in Wiki.
- The Playback indicator has been moved to the left a little bit when YouTube Videos are playing, to not get in the way of the close and information buttons
- The Close (and info) buttons now close when the green flag is clicked, so that they do not persist.
- Minor bug fixes
***
## Alpha 1.11.0
- When viewing a video, You are now able to see the Like, Dislike, View counters, and the description, which you can scroll through.
#### Known Bugs
  - Descriptions with too long lines can mess up how they are rendered. This will be fixed soon.
  - The screen is a little broken on X2 Screen Size.
### Alpha 1.11.1
- The Video Info now shows the Video's channel name
- Minor Bug Fixes
### Alpha 1.11.2
- A basic text wrapper has been implemented, but is currently half broken.
### Alpha 1.11.3
- Added a YouTube Style Popup for when you press the spacebar to pause a video
- Fixed some layering issues
### Alpha 1.11.4
- Fixed some word wrapping issues, and everything looks nice and good.
### Alpha 1.11.5
- Updated the SoundCloud Popup
- Added an easter egg
- Added more bugs to fix later
### Alpha 0.11.60
- New Numbering Scheme!
- Clicking on the video now shows the play/pause popup
- Updated some of the text to use the Roboto Font instead of sans-serif
- Removed some Unused Variables
- Added a Preview Logo to the About Player
- probably broke something by deleting a variable... oops
### Alpha 0.11.61
- The project is now available compiled.
- There is now a fallback for the Easter Egg in case you are using the packaged project, because from my testing it doesn't work as intended.
- Minor Bug Fixes
Known Bugs:
 - The Playback Time flickers when the value is updated on the HTML Version.
