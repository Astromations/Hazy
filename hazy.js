(function hazy() {
  if (!(Spicetify.Player.data && Spicetify.Platform)) {
    setTimeout(hazy, 100);
    return;
  }

  console.log("Hazy is running"); 
  function getAlbumInfo(uri) {
      return Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${uri}`);
  }


  async function fetchFadeTime() {
    const response = await Spicetify.Platform.PlayerAPI._prefs.get({ key: "audio.crossfade_v2" });
    const crossfadeEnabled = response.entries["audio.crossfade_v2"].bool;
    
    let FadeTime = "3s"; // Default value of 3 seconds
    
    if (crossfadeEnabled) {
      const fadeTimeResponse = await Spicetify.Platform.PlayerAPI._prefs.get({ key: "audio.crossfade.time_v2" });
      const fadeTime = fadeTimeResponse.entries["audio.crossfade.time_v2"].number;
      const dividedTime = fadeTime / 1000;
      FadeTime = dividedTime + "s";
    }
    
    document.documentElement.style.setProperty("--fade-time", FadeTime);
    console.log(FadeTime);
    // Use the CSS variable "--fade-time" for transition time
;
  }

  async function songchange() {

      fetchFadeTime(); // Call fetchFadeTime after songchange

      let album_uri = Spicetify.Player.data.track.metadata.album_uri;
      let bgImage = Spicetify.Player.data.track.metadata.image_url;
  
      if (album_uri !== undefined && !album_uri.includes("spotify:show")) {
          const albumInfo = await getAlbumInfo(album_uri.replace("spotify:album:", ""));
  
      } else if (Spicetify.Player.data.track.uri.includes("spotify:episode")) {
          // podcast
          bgImage = bgImage.replace("spotify:image:", "https://i.scdn.co/image/");
          
      } else if (Spicetify.Player.data.track.provider == "ad") {
          // ad
          return;
      } else {
          // When clicking a song from the homepage, songChange is fired with half empty metadata
          // todo: retry only once?
          setTimeout(songchange, 200);
      }
      document.documentElement.style.setProperty("--image_url", `url("${bgImage}")`);
  
  }
  
  Spicetify.Player.addEventListener("songchange", songchange);
  songchange(); 
  

  (function sidebar() {
    // Sidebar settings
    const item = localStorage.getItem("spicetify-exp-features");
    const parsedObject = JSON.parse(item);
  
    // Variable if client needs to reload
    let reload = false;
  
    // Array of features
    const features = [
      "enableYLXSidebar",
      "enableRightSidebar",
      "enableRightSidebarTransitionAnimations",
      "enableRightSidebarLyrics",
      "enableRightSidebarExtractedColors",
      "enablePanelSizeCoordination"
    ];
  
    // Loop over the array
    for (const feature of features) {
      // Ignore if feature not present
      if (!parsedObject[feature]) continue;
  
      // Change value if disabled
      if (!parsedObject[feature].value) {
        parsedObject[feature].value = true;
        reload = true;
      }
    }
  
    localStorage.setItem("spicetify-exp-features", JSON.stringify(parsedObject));
    if (reload) {
      window.location.reload();
      reload = false
    }
  })()
  
})()
