# Patch Notes

### Alpha 0.1
- Added Basic Playback with Turbowarp's Video and File Plugin.
### Alpha 0.2c
- Worked with Claude to automatically crop videos
### Alpha 0.3c
- (tried to) Fix a bug where the video's resolution values are two times too small when in reality the scaling was completely off
### Alpha 0.4
- Actually fixed it.
### Alpha 0.5
- Added a Play/Pause Button
### Alpha 0.6c
- Worked with Claude to create a Progress Bar
## Alpha 1.0c
- Progress Bar implemented!
### Alpha 1.1c
- Fixed a bug where scrolling too fast would cause the playhead to just... return to its original position
- Fixed a bug where audio would play while scrubbing, creating a really unpleasant noise
- Fixed a bug where scrubbing while paused would restart the video.
## Alpha 1.2
- Added Audio Support!
- Changed the "Open..." option on the menu to be a dropdown list
- Planning to add support for a live waveform
### Alpha 1.2.1
- Fixed a bug not allowing Audios to Scrub properly
## Alpha 1.3
- Added a visualiser to see the length and current duration of a video/audio
### Alpha 1.3.1
- The Play/Pause button now checks every second to make sure it shows correctly
## Alpha 1.4
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
## Alpha 1.5c
- The progress bar now shows, replacing the old pen method.
- Replaced the Pen Drawing Sprite with a stretching one instead
### Alpha 1.5.1c
- Fixed a bug where selecting one file format, then the other, would cause some parts of the UI to break
## Alpha 1.6
- Added YouTube Video Support
### Alpha 1.6.1
- Added Basic Multi-Video Support - It doesn't make a difference right now.
## Alpha 1.7c
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
## Alpha 1.8
- Added Support for Resizing the stage, so that some UI elements of the YouTube Player aren't too compact
## Alpha 1.9c
- The Audio Waveform can now show both Mono and Stereo Audio Types, with the waveform changing depending on the amount of channels
### Alpha 1.9.1
- When loading an audio, a script now checks if the audio is mono or stereo, and selects the waveform automatically
### Alpha 1.9.2c
- Fixed a bug where Stereo and Mono audios wouldn't load the correct waveform
- Fixed a bug where the Waveform would generate 1 or 2 spaces to the right
### Alpha 1.9.3
- Video files can now be played as audios, showing the waveform
### Alpha 1.9.4
- Added a loop button, which can make audios and videos loop
#### Known Bugs
 - Sometimes the automatic check that runs every time a video is loaded will finish after the waveform is drawn, leading to the waveform being half mono and half stereo
 - The loop button can sometimes softlock the pause button, breaking it.
## Alpha 1.10c
- Time Synced Lyrics are now here!
 - When clicking on the lyrics button, you can search for songs, and if they're in the database, you can have time synced lyrics on the screen. (only supported for audio files, not videos)
### Alpha 1.10.1c
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
- Changed the [Open YouTube Video] Button to a pop-up, which still has the option to open a YouTube Video.
- The [Open....] Button now has 3 periods, instead of 4.
- The [Open YouTube Video] Button now has the text centred.
### Alpha 1.10.7
- The option to load a SoundCloud song is now available, but non-functional yet.
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
## Alpha 1.11.0c
- When viewing a video, You are now able to see the Like, Dislike, View counters, and the description, which you can scroll through.
Known Bugs
  - Descriptions with too long lines can mess up how they are rendered. This will be fixed soon.
  - The screen is a little broken on X2 Screen Size.
### Alpha 1.11.1c
- The Video Info now shows the Video's channel name
- Minor Bug Fixes
### Alpha 1.11.2c
- A basic text wrapper has been implemented, but is currently half broken.
### Alpha 1.11.3
- Added a YouTube Style Popup for when you press the spacebar to pause a video
- Fixed some layering issues
### Alpha 1.11.4c
- Fixed some word wrapping issues, and everything looks nice and good.
### Alpha 1.11.5
- Updated the SoundCloud Popup
- Added an easter egg
- Added more bugs to fix later
### Alpha 0.11.60
- New Numbering System!
- Clicking on the video now shows the play/pause popup
- Updated some of the text to use the Roboto Font instead of sans-serif
- Removed some Unused Variables
- Added a Preview Logo to the About Player
- probably broke something by deleting a variable... oops
### Alpha 0.11.61
- The project is now available compiled.
- There is now a fallback for the Easter Egg in case you are using the packaged project, because from my testing it doesn't work as intended.
- Minor Bug Fixes
#### Known Bugs:
  - The Playback Time flickers when the value is updated on the HTML Version.
### Alpha 0.11.62c
- Updated some assets (specifically the Select Audio File Popup, it now lets you know you can load videos with it)
### Alpha 0.11.63
- Fixed a bug that caused the stage to load as the wrong size, and all the elements being incorrectly sized
- Resizing the stage should no longer reset all imported songs, and shouldn't have a delay.
### Alpha 0.11.64
- Resizing the stage now properly resizes the waveform, but has to refresh the entire thing.
### Alpha 0.11.70c
- Certain buttons on the UI now change how the mouse cursor looks when hovered.
- The code to render the waveform no longer hangs when the stage is resized
- The "Choose an Audio File" popup now stays on top of the waveform when it is rendering
- Made some changes to how the scripts wait for the waveform. Previously, it was a set length. Now, it waits until it has finished rendering to play the file.
- Minor bug fixes
### Alpha 0.11.71
- Minor Bug Fixes
- The stage now automatically resizes when a YouTube Video is Playing, and will (hopefully) be able to support a 16:9 aspect ratio in the future!
### Alpha 0.11.80
- There is now a Fullscreen Button, allowing you to view videos in fullscreen!
### Alpha 0.11.81
- Minor Bug Fixes
- When entering fullscreen, there is now a progress bar at the bottom.
- In Fullscreen, all of the UI elements fade out if not hovered over
#### Known Bugs
 - Unfocusing on a window doesn't change how the playback Time variable is displayed, might be because of lag, but it just doesn't change.
### Alpha 0.11.82
- The Stage Size has been reverted back to the x1, x2 options.
## Alpha 0.12c
- Added a NEW Lyrics renderer that looks and feels more like the Apple Music version.
  - still buggy
  - the waveform generates quicker now
  - the waveform also dims when the lyrics are on screen.
- Fixed a bug where unfocusing on the window wouldn't change the playback time to be XX:XX:--
  - Instead of running a forever loop to calculate the time, it loops until the window is unfocused, so instead of just infinitely going on, it's able to stop and switch to the other script.
- Various Bug Fixes
#### KNOWN BUGS
- Clicking on the Lyrics button after the song has ended doesn't show the lyrics. This is due to the way that the lyrics check if the song has finished, as to not waste resources
### Alpha 0.12.01c
- Fixed a bug where pressing on the Lyrics button would overflow the stage with hidden clones.
- Various Bug Fixes
### Alpha 0.12.02c
- the ● ● ● on the lyrics now dynamically change and pulse
  - Currently Broken
- Fixed how lyrics are calculated, hopefully preventing any other problems.
- Various Bug Fixes
### Alpha 0.12.10c
- So. Many. Bugs.
  - Many bugs were found and ironed out.
- The three dots no longer pulse after being scrolled passed
- You can now scrub lyrics properly
  - Before, you had to toggle the lyrics to get them to scroll.
- The text is now half the width
### Alpha 0.12.20
- Skipping songs no longer resets the lyrics
### Alpha 0.12.30
- Added an Offset for Lyrics for Music Videos that have an introduction, or out-of-sync lyrics. It's currently not customisable.
- Removed the "+50 hours of work" from the About Video Player menu, since it's hard to keep track of.
### Alpha 0.12.31
- Searching for Album Covers is now being worked on
### Alpha 0.12.40
- After Lyrics are Inputted, the Album Cover will show up. This uses the iTunes API.
### Alpha 0.12.41
- Minor Bug Fixes
### Alpha 0.12.42
- Minor Bug Fixes
***
Versions where Claude helped build code will be marked with a "c" at the end. This applies to earlier versions as well.
***
### Alpha 0.12.43c
- Added VERY EARLY PROTOTYPE animated background support
  - this probably doesn't work
- SO. MUCH. WORK
  - There's a lot of bug fixes
### Alpha 0.12.50c
- FINALLY!!!
  - Added Animated Background Support, which is shown when you've inputted lyrics. No guarantee you won't be rate limited, though.
- Many bug fixes
### Alpha 0.12.51c
- Lyrics now scroll fluidly, and one at a time.
### Alpha 0.12.52
- Fixed a bug where toggling lyrics while paused would break the gradient background
- Fixed a bug where lyrics would have the delay even while scrubbing.
### Alpha 0.12.53
- Added a check for artists names so that song cover search is more accurate
- iTunes now gives 5 results, in case the album art is wrong. The other results don't do anything only the first one is used.
### Alpha 0.12.54
- Fixed a bug where the wrong album cover and song name would be used when showing lyrics
