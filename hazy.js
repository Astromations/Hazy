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
    
    let FadeTime = "0.4s"; // Default value of 0.4 seconds, otherwise syncs with crossfade time
    
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
      updateLyricsMaxWidth(); //Bloom Lyrics Page
  
  }
  
  Spicetify.Player.addEventListener("songchange", songchange);
  songchange();
  windowControls();
  
  

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

  async function onResize() {
    updateLyricsMaxWidth();
  }
  window.onresize = onResize;

  function windowControls() {
    function detectOS() {
      const userAgent = window.navigator.userAgent;
      
      if (userAgent.indexOf('Win') !== -1) {
        document.body.classList.add('windows');
      }
    }
    
    // Call detectOS() immediately
    detectOS();
  }

// fixes container shifting & active line clipping from Bloom | https://github.com/nimsandu/spicetify-bloom/tree/main
function updateLyricsMaxWidth() {

  function waitForElement(els, func, timeout = 100) {
    const queries = els.map((el) => document.querySelector(el));
    if (queries.every((a) => a)) {
      func();
    } else if (timeout > 0) {
      setTimeout(waitForElement, 300, els, func, timeout - 1);
    }
  }

  function detectTextDirection() {
    // 0, 1 - blank lines
    const lyric = document.getElementsByClassName('lyrics-lyricsContent-lyric')[2];
    const rtl_rx = /[\u0591-\u07FF]/;
    return rtl_rx.test(lyric.innerHTML) ? 'rtl' : 'ltr';
  }

  function setLyricsTransformOrigin(textDirection) {
    const root = document.querySelector(':root');
    if (textDirection === 'rtl') {
      root.style.setProperty('--lyrics-text-direction', 'right');
    } else {
      root.style.setProperty('--lyrics-text-direction', 'left');
    }
  }

  function setLyricsMaxWidth() {
    const lyricsContentWrapper = document.getElementsByClassName(
      'lyrics-lyrics-contentWrapper'
    )[0];
    const lyricsContentContainer = document.getElementsByClassName(
      'lyrics-lyrics-contentContainer'
    )[0];

    lyricsContentWrapper.style.maxWidth = '';
    lyricsContentWrapper.style.width = '';

    const textDirection = detectTextDirection();
    setLyricsTransformOrigin(textDirection);
    let offset;
    let maxWidth;

    if (textDirection === 'rtl') {
      offset =
        lyricsContentWrapper.offsetRight +
        parseInt(window.getComputedStyle(lyricsContentWrapper).marginRight, 10);
      maxWidth = Math.round(0.95 * (lyricsContentContainer.clientWidth - offset));
    } else {
      offset =
        lyricsContentWrapper.offsetLeft +
        parseInt(window.getComputedStyle(lyricsContentWrapper).marginLeft, 10);
      maxWidth = Math.round(0.95 * (lyricsContentContainer.clientWidth - offset));
    }

    lyricsContentWrapper.style.setProperty('--lyrics-active-max-width', `${maxWidth}px`);
    const lyricsContentWrapperWidth = lyricsContentWrapper.getBoundingClientRect().width;
    lyricsContentWrapper.style.maxWidth = `${lyricsContentWrapperWidth}px`;
    lyricsContentWrapper.style.width = `${lyricsContentWrapperWidth}px`;
  }

  function lyricsCallback(mutationsList, lyricsObserver) {
    for (let i = 0; i < mutationsList.length; i += 1) {
      for (let a = 0; a < mutationsList[i].addedNodes?.length; a += 1) {
        if (mutationsList[i].addedNodes[a].classList?.contains('lyrics-lyricsContent-provider')) {
          setLyricsMaxWidth();
        }
      }
    }
    lyricsObserver.disconnect;
  }

  waitForElement(['.lyrics-lyricsContent-provider'], () => {
    setLyricsMaxWidth();

    const lyricsContentWrapper = document.getElementsByClassName(
      'lyrics-lyrics-contentWrapper'
    )[0];
    const lyricsObserver = new MutationObserver(lyricsCallback);
    const lyricsObserverConfig = {
      attributes: false,
      childList: true,
      subtree: false,
    };
    lyricsObserver.observe(lyricsContentWrapper, lyricsObserverConfig);
  });
}
  
})()





