(function hazy() {
  if (!(Spicetify.Player.data && Spicetify.Platform)) {
    setTimeout(hazy, 100);
    return;
  }

  console.log("Hazy is running"); 
  function getAlbumInfo(uri) {
      return Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${uri}`);
  }

  function valueSet() {
    // Check if blurValue is NaN
    const blurValue = parseInt(localStorage.getItem("blurAmount"));
    const contValue = parseInt(localStorage.getItem("contAmount"));
    const satuValue = parseInt(localStorage.getItem("satuAmount"));
    const brightValue = parseInt(localStorage.getItem("brightAmount"));

    if (!isNaN(blurValue)) {
      document.documentElement.style.setProperty("--blur", `${blurValue}px`);
    } else {
      document.documentElement.style.setProperty("--blur", `15px`);
    }
    
    if (!isNaN(contValue)) {
      document.documentElement.style.setProperty("--cont", `${contValue}%`);
    } else {
      document.documentElement.style.setProperty("--cont", `50%`);
    }
    
    if (!isNaN(satuValue)) {
      document.documentElement.style.setProperty("--satu", `${satuValue}%`);
    } else {
      document.documentElement.style.setProperty("--satu", `70%`);
    }

    if (!isNaN(brightValue)) {
      document.documentElement.style.setProperty("--bright", `${brightValue}%`);
    } else {
      document.documentElement.style.setProperty("--bright", `120%`);
    }
  }
  valueSet()

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

  async function onSongChange() {
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
          setTimeout(onSongChange, 200);
      }

      loopOptions("/")
      updateLyricsPageProperties();
  }
  
  Spicetify.Player.addEventListener("songchange", onSongChange);
  onSongChange();
  windowControls();
  galaxyFade();

  function scrollToTop() {
    const element = document.querySelector(".main-entityHeader-container");
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  document.addEventListener('click', (event) => {
    const clickedElement = event.target;
    if (clickedElement.closest('.main-entityHeader-topbarTitle')) {
      scrollToTop();
    }
  });
  

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

  window.onresize = updateLyricsPageProperties;

  Spicetify.Platform.History.listen(updateLyricsPageProperties);

  function waitForElement(elements, func, timeout = 100) {
    const queries = elements.map((element) => document.querySelector(element));
    if (queries.every((a) => a)) {
      func();
    } else if (timeout > 0) {
      setTimeout(waitForElement, 300, elements, func, timeout - 1);
    }
  }

  waitForElement(['.Root__lyrics-cinema'], () => {
    const lyricsCinema = document.getElementsByClassName('Root__lyrics-cinema')[0];
    const lyricsCinemaObserver = new MutationObserver(updateLyricsPageProperties);
    const lyricsCinemaObserverConfig = {
      attributes: true,
      attributeFilter: ['class'],
      childList: false,
      subtree: false,
    };
    lyricsCinemaObserver.observe(lyricsCinema, lyricsCinemaObserverConfig);
  });

  // fixes container shifting & active line clipping | taken from Bloom: https://github.com/nimsandu/spicetify-bloom
  function updateLyricsPageProperties() {
    function setLyricsPageProperties() {
      function detectTextDirection() {
        // 0, 1 - blank lines
        const lyric = document.getElementsByClassName('lyrics-lyricsContent-lyric')[2];
        // https://stackoverflow.com/questions/13731909/how-to-detect-that-text-typed-in-text-area-is-rtl
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

      function calculateLyricsMaxWidth(textDirection, lyricsWrapper, lyricsContainer) {
        let offset;
        let maxWidth;
  
        if (textDirection === 'rtl') {
          offset =
          lyricsWrapper.offsetRight +
            parseInt(window.getComputedStyle(lyricsWrapper).marginRight, 10);
          maxWidth = Math.round(0.95 * (lyricsContainer.clientWidth - offset));
        } else {
          offset =
          lyricsWrapper.offsetLeft +
            parseInt(window.getComputedStyle(lyricsWrapper).marginLeft, 10);
          maxWidth = Math.round(0.95 * (lyricsContainer.clientWidth - offset));
        }
  
        return maxWidth;
      }

      function lockLyricsWrapperWidth(lyricsWrapper) {
        const lyricsWrapperWidth = lyricsWrapper.getBoundingClientRect().width;
        lyricsWrapper.style.maxWidth = `${lyricsWrapperWidth}px`;
        lyricsWrapper.style.width = `${lyricsWrapperWidth}px`;
      }

      waitForElement(['.lyrics-lyrics-contentWrapper'], () => {
        const lyricsContentWrapper = document.getElementsByClassName(
          'lyrics-lyrics-contentWrapper'
        )[0];
        const lyricsContentContainer = document.getElementsByClassName(
          'lyrics-lyrics-contentContainer'
        )[0];

        lyricsContentWrapper.style.maxWidth = '';
        lyricsContentWrapper.style.width = '';

        const lyricsTextDirection = detectTextDirection();
        setLyricsTransformOrigin(lyricsTextDirection);
        const lyricsMaxWidth = calculateLyricsMaxWidth(
          lyricsTextDirection,
          lyricsContentWrapper,
          lyricsContentContainer
        );
        lyricsContentWrapper.style.setProperty('--lyrics-active-max-width', `${lyricsMaxWidth}px`);
        lockLyricsWrapperWidth(lyricsContentWrapper);
      });
    }

    function lyricsCallback(mutationsList, lyricsObserver) {
      for (let i = 0; i < mutationsList.length; i += 1) {
        for (let a = 0; a < mutationsList[i].addedNodes?.length; a += 1) {
          if (mutationsList[i].addedNodes[a].classList?.contains('lyrics-lyricsContent-provider')) {
            setLyricsPageProperties();
          }
        }
      }
      lyricsObserver.disconnect;
    }

    waitForElement(['.lyrics-lyrics-contentWrapper'], () => {
      waitForElement(['.lyrics-lyricsContent-provider'], () => {
        setLyricsPageProperties();

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
    });
  }

  function galaxyFade() { //Shamelessly stolen from the Galaxy theme | https://github.com/harbassan/spicetify-galaxy/
    
    function waitForElement(els, func, timeout = 100) {
      const queries = els.map(el => document.querySelector(el));
      if (queries.every(a => a)) {
        func(queries);
      } else if (timeout > 0) {
        setTimeout(waitForElement, 50, els, func, --timeout);
      }
    }
  
    // add fade and dimness effects to mainview scroll node
    waitForElement([".Root__main-view .os-viewport.os-viewport-native-scrollbars-invisible"], ([scrollNode]) => {
      scrollNode.addEventListener("scroll", () => {
        // fade
        if (scrollNode.scrollTop == 0) {
          scrollNode.setAttribute("fade", "bottom");
        } else if (scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight == 0) {
          scrollNode.setAttribute("fade", "top");
        } else {
          scrollNode.setAttribute("fade", "full");
        }
      });
    });
  
    waitForElement([".Root__nav-bar .os-viewport.os-viewport-native-scrollbars-invisible"], ([scrollNode]) => {
      scrollNode.setAttribute("fade", "bottom");
      scrollNode.addEventListener("scroll", () => {
        // fade
        if (scrollNode.scrollTop == 0) {
          scrollNode.setAttribute("fade", "bottom");
        } else if (scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight == 0) {
          scrollNode.setAttribute("fade", "top");
        } else {
          scrollNode.setAttribute("fade", "full");
        }
      });
    });
  
  waitForElement([".Root__nav-right-sidebar .os-viewport.os-viewport-native-scrollbars-invisible"], ([scrollNode]) => {
    scrollNode.setAttribute("fade", "bottom");
    scrollNode.addEventListener("scroll", () => {
      // fade
      if (scrollNode.scrollTop == 0) {
        scrollNode.setAttribute("fade", "bottom");
      } else if (scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight == 0) {
        scrollNode.setAttribute("fade", "top");
      } else {
        scrollNode.setAttribute("fade", "full");
      }
    });
  });    
  }

  const config = {}

  function parseOptions() {
    config.useCurrSongAsHome = JSON.parse(localStorage.getItem("UseCustomBackground"));
  }

  parseOptions()

  function loopOptions(page) {
    if (page === "/") {
      if (config.useCurrSongAsHome) {
        document.documentElement.style.setProperty("--image_url", `url("${startImage}")`);
        console.log('song background set');
      } else {
        let bgImage = Spicetify.Player.data.track.metadata.image_url
        document.documentElement.style.setProperty("--image_url", `url("${bgImage}")`);
        console.log('custom background set');
      }
    } 
  }

  const defImage = `https://elmina.club/uploads/posts/2023-05/1684477431_elmina-club-p-uyutnii-fon-dlya-rabochego-stola-foni-pint-52.png`;
  let startImage = localStorage.getItem("hazy:startupBg") || defImage;

  // input for custom background images
  const bannerInput = document.createElement("input");
  bannerInput.type = "file";
  bannerInput.className = "banner-input";
  bannerInput.accept = ["image/jpeg", "image/apng", "image/avif", "image/gif", "image/png", "image/svg+xml", "image/webp"].join(",");

  // listen for edit playlist popup
  const editObserver = new MutationObserver(mutation_list => {
    for (let mutation of mutation_list) {
      if (mutation.addedNodes.length) {
        const popupContent = mutation.addedNodes[0].querySelector(".main-trackCreditsModal-container");
        if (!popupContent) continue;

        const coverSelect = popupContent.querySelector(".main-playlistEditDetailsModal-albumCover");
        const bannerSelect = coverSelect.cloneNode(true);
        bannerSelect.id = "banner-select";

        const [, , uid] = Spicetify.Platform.History.location.pathname.split("/");

        const srcInput = document.createElement("input");
        srcInput.type = "text";
        srcInput.classList.add("main-playlistEditDetailsModal-textElement", "main-playlistEditDetailsModal-titleInput");
        srcInput.id = "src-input";
        srcInput.placeholder = "Background image URL (recommended)";

        const optButton = bannerSelect.querySelector(".main-playlistEditDetailsModal-imageDropDownButton");
        optButton.querySelector("svg").children[0].remove();
        optButton.querySelector("svg").append(document.querySelector(".main-playlistEditDetailsModal-closeBtn path").cloneNode());

        optButton.onclick = () => {
          localStorage.removeItem("hazy:playlistBg:" + uid);
          bannerSelect.querySelector("img").src = coverSelect.querySelector("img").src;
        };

        popupContent.append(bannerSelect);
        popupContent.append(bannerInput);
        popupContent.append(srcInput);

        const editButton = bannerSelect.querySelector(".main-editImageButton-image.main-editImageButton-overlay");
        editButton.onclick = () => {
          bannerInput.click();
        };

        const save = popupContent.querySelector(".main-playlistEditDetailsModal-save button");
        save.addEventListener("click", () => {
          if (srcInput.value) {
            localStorage.setItem("hazy:playlistBg:" + uid, srcInput.value);
          }

        });
      }
    }
  });

  editObserver.observe(document.body, { childList: true });

  // when user selects a custom background image
  bannerInput.onchange = () => {
    if (!bannerInput.files.length) return;

    const file = bannerInput.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target.result;
      const [, , uid] = Spicetify.Platform.History.location.pathname.split("/");
      if (!uid) {
        try {
          localStorage.setItem("hazy:startupBg", result);
        } catch {
          Spicetify.showNotification("File too large");
          return;
        }
        document.querySelector("#home-select img").src = result;
      } else {
        try {
          localStorage.setItem("hazy:playlistBg:" + uid, result);
        } catch {
          Spicetify.showNotification("File too large");
          return;
        }

        document.querySelector("#banner-select img").src = result;
        document.querySelector("#banner-select img").removeAttribute("srcset");
      }
    };
    reader.readAsDataURL(file);
  };

  // create edit home topbar button
  const homeEdit = new Spicetify.Topbar.Button("Hazy Settings", "edit", () => {
    const content = document.createElement("div");
    content.innerHTML = `
    <div class="main-playlistEditDetailsModal-albumCover" id="home-select">
      <div class="main-entityHeader-image" draggable="false">
        <img aria-hidden="false" draggable="false" loading="eager" class="main-image-image main-entityHeader-image main-entityHeader-shadow"></div>
      <div class="main-playlistEditDetailsModal-imageChangeButton">
        <div class="main-editImage-buttonContainer">
          <button class="main-editImageButton-image main-editImageButton-overlay" aria-haspopup="true" type="button">
            <div class="main-editImageButton-icon icon">
              <svg role="img" height="48" width="48" aria-hidden="true" viewBox="0 0 24 24" class="Svg-sc-1bi12j5-0 EQkJl">
                <path d="M17.318 1.975a3.329 3.329 0 114.707 4.707L8.451 20.256c-.49.49-1.082.867-1.735 1.103L2.34 22.94a1 1 0 01-1.28-1.28l1.581-4.376a4.726 4.726 0 011.103-1.735L17.318 1.975zm3.293 1.414a1.329 1.329 0 00-1.88 0L5.159 16.963c-.283.283-.5.624-.636 1l-.857 2.372 2.371-.857a2.726 2.726 0 001.001-.636L20.611 5.268a1.329 1.329 0 000-1.879z"></path></svg><span class="Type__TypeElement-goli3j-0 gAmaez main-editImageButton-copy">Choose photo</span></div></button></div></div><div class="main-playlistEditDetailsModal-imageDropDownContainer"><button class="main-playlistEditDetailsModal-imageDropDownButton" type="button"><svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-1bi12j5-0 EQkJl"><path d="M1.47 1.47a.75.75 0 011.06 0L8 6.94l5.47-5.47a.75.75 0 111.06 1.06L9.06 8l5.47 5.47a.75.75 0 11-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 01-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 010-1.06z"></path>
              </svg><span class="hidden-visually">Edit photo</span></button></div></div>`;

    const optionList = document.createElement("div");
    const valueList = document.createElement("div");

    function createOption(name, desc, defVal) {
      const optionRow = document.createElement("div");
      optionRow.classList.add("hazyOptionRow");
      optionRow.innerHTML = `
      <span class="hazyOptionDesc">${desc}</span>
      <button class="hazyOptionToggle">
        <span class="toggleWrapper">
          <span class="toggle"></span>
        </span>
      </button>`;
      optionRow.setAttribute("name", name);
      optionRow.querySelector("button").addEventListener("click", () => {
      optionRow.querySelector(".toggle").classList.toggle("enabled");
      });
      const isEnabled = JSON.parse(localStorage.getItem(name)) ?? defVal;
      optionRow.querySelector(".toggle").classList.toggle("enabled", isEnabled);
      optionList.append(optionRow);
    };

    function setValue(blur_am, cont, satu, bright, desc) {
      let valueRow = document.createElement("div");
      let blur_val = localStorage.getItem(blur_am);
      let cont_val = localStorage.getItem(cont);
      let satu_val = localStorage.getItem(satu);
      let bright_val = localStorage.getItem(bright);

    if (localStorage.getItem(blur_am) === null) {
      bright_val = "15";
    }

    if (localStorage.getItem(cont) === null) {
      cont_val = "50";
    }

    if (localStorage.getItem(satu) === null) {
      satu_val = "70";
    }

    if (localStorage.getItem(bright) === null) {
      bright_val = "120";
    }
    
      valueRow.classList.add("hazyOptionRow");
      valueRow.innerHTML = `
      <div class="blur-amount" style='width: 100%'>
      <p>${desc}</p>
      <div class="slider-container">
        <label for="blur-input">Blur:</label>
        <input class="slider" id="blur-input" type="range" min="0" max="50" step="1" value="${blur_val}">
        <div class="slider-value">
          <div id="blur-value" contenteditable="true" >${blur_val}</div>
          <div id="unit" class="blur-editable">px</div>
        </div>
      </div>
    
      <div class="slider-container">
        <label for="cont-input">Contrast:</label>
        <input class="slider" id="cont-input" type="range" min="0" max="200" step="2" value="${cont_val}">
        <div class="slider-value">
          <div id="cont-value" contenteditable="true" >${cont_val}</div>
          <div id="unit" class="cont-editable">%</div>
        </div>
      </div>

      <div class="slider-container">
        <label for="satu-input">Saturation:</label>
        <input class="slider"  id="satu-input" type="range" min="0" max="200" step="2" value="${satu_val}">
        <div class="slider-value">
          <div id="satu-value" contenteditable="true">${satu_val}</div>
          <div id="unit" class="satu-editable">%</div>
        </div>
      </div>

      <div class="slider-container">
        <label for="bright-input">Brightness:</label>
        <input class="slider" id="bright-input" type="range" min="0" max="200" step="2" value="${bright_val}">
        <div class="slider-value">
          <div id="bright-value" contenteditable="true">${bright_val}</div>
          <div id="unit" class="bright-editable">%</div>
        </div>
      </div>

    </div>`;

    valueRow.querySelector("#blur-value").addEventListener("input", function() {
      let content = valueRow.querySelector("#blur-value").textContent.trim();
      let number = parseInt(content);
      if (content.length > 3) {
        content = valueRow.querySelector("#blur-value").textContent = content.slice(0, 3); // Truncate the content to 3 characters
      }
        valueRow.querySelector("#blur-input").value = number;
      });

    valueRow.querySelector("#cont-value").addEventListener("input", function() {
      let content = valueRow.querySelector("#cont-value").textContent.trim();
      let number = parseInt(content);
      if (content.length > 3) {
        content = valueRow.querySelector("#cont-value").textContent = content.slice(0, 3); // Truncate the content to 3 characters
      }
        valueRow.querySelector("#cont-input").value = number;
      });

    valueRow.querySelector("#satu-value").addEventListener("input", function() {
      let content = valueRow.querySelector("#satu-value").textContent.trim();
      let number = parseInt(content);
      if (content.length > 3) {
        content = valueRow.querySelector("#satu-value").textContent = content.slice(0, 3); // Truncate the content to 3 characters
      }
        valueRow.querySelector("#satu-input").value = number;
      });

    valueRow.querySelector("#bright-value").addEventListener("input", function() {
      let content = valueRow.querySelector("#bright-value").textContent.trim();
      let number = parseInt(content);
      if (content.length > 3) {
        content = valueRow.querySelector("#bright-value").textContent = content.slice(0, 3); // Truncate the content to 3 characters
        console.log("bals")
      }
        valueRow.querySelector("#bright-input").value = number;
      });

    valueRow.querySelector("#blur-input").addEventListener("input", function() {
    valueRow.querySelector("#blur-value").textContent = valueRow.querySelector("#blur-input").value;
    });

    valueRow.querySelector("#cont-input").addEventListener("input", function() {
    valueRow.querySelector("#cont-value").textContent = valueRow.querySelector("#cont-input").value;
      });

    valueRow.querySelector("#satu-input").addEventListener("input", function() {
    valueRow.querySelector("#satu-value").textContent = valueRow.querySelector("#satu-input").value;
      });

    valueRow.querySelector("#bright-input").addEventListener("input", function() {
    valueRow.querySelector("#bright-value").textContent = valueRow.querySelector("#bright-input").value;
    });

    valueSet();

    valueList.appendChild(valueRow);
    valueRow.setAttribute("blur_am", blur_am);
    valueRow.setAttribute("cont", cont);
    valueRow.setAttribute("satu", satu);
    valueRow.setAttribute("bright", bright);
    };

    const srcInput = document.createElement("input");
    srcInput.type = "text";
    srcInput.classList.add("main-playlistEditDetailsModal-textElement", "main-playlistEditDetailsModal-titleInput");
    srcInput.id = "src-input";
    srcInput.placeholder = "Background image URL (recommended due to size limits)";
    if (!startImage.startsWith("data:image")) {
      srcInput.value = startImage;
    }    
    content.append(srcInput);

    createOption("UseCustomBackground", "Custom background:", false);
    setValue("blurAmount", "contAmount", "satuAmount", "brightAmount", " ")

    content.append(optionList);
    content.append(valueList);
    

    img = content.querySelector("img");
    img.src = localStorage.getItem("hazy:startupBg") || defImage;
    const editButton = content.querySelector(".main-editImageButton-image.main-editImageButton-overlay");
    editButton.onclick = () => {
      bannerInput.click();
    };
    const removeButton = content.querySelector(".main-playlistEditDetailsModal-imageDropDownButton");
    removeButton.onclick = () => {
      content.querySelector("img").src = defImage;
    };

    const resetButton = document.createElement("button");
    resetButton.id = "value-reset";
    resetButton.innerHTML = "Reset";

    const saveButton = document.createElement("button");
    saveButton.id = "home-save";
    saveButton.innerHTML = "Save";

    saveButton.addEventListener("click", () => {
      // update changed bg image
      startImage = srcInput.value || content.querySelector("img").src;
      localStorage.setItem("hazy:startupBg", startImage);
      onSongChange();

      // save options to local storage
      [...optionList.children].forEach(option => {
        localStorage.setItem(option.getAttribute("name"), option.querySelector(".toggle").classList.contains("enabled"));
        console.log(`hazy: ${option.getAttribute("name")} set to ${option.querySelector(".toggle").classList.contains("enabled")}`);
      });

      [...valueList.children].forEach(value => {
        let blurValueInput = value.querySelector('#blur-input');
        let contValueInput = value.querySelector('#cont-input');
        let satuValueInput = value.querySelector('#satu-input');
        let brightValueInput = value.querySelector('#bright-input');
      
        localStorage.setItem(value.getAttribute("blur_am"), blurValueInput.value);
        localStorage.setItem(value.getAttribute("cont"), contValueInput.value);
        localStorage.setItem(value.getAttribute("satu"), satuValueInput.value);
        localStorage.setItem(value.getAttribute("bright"), brightValueInput.value);

        valueSet()
      });  

      parseOptions();
      loopOptions("/")
    });

    resetButton.addEventListener("click", () => {
      [...valueList.children].forEach(value => {

        document.querySelector(".hazyOptionRow #blur-input").value = 15;
        document.querySelector(".hazyOptionRow #cont-input").value = 50;
        document.querySelector(".hazyOptionRow #satu-input").value = 70;
        document.querySelector(".hazyOptionRow #bright-input").value = 120;

        document.querySelector(".hazyOptionRow #blur-value").textContent = "15px";
        document.querySelector(".hazyOptionRow #cont-value").textContent = "50%";
        document.querySelector(".hazyOptionRow #satu-value").textContent = "70%";
        document.querySelector(".hazyOptionRow #bright-value").textContent = "120%";


        localStorage.setItem(value.getAttribute("blur_am"), 8);
        localStorage.setItem(value.getAttribute("cont"), 50);
        localStorage.setItem(value.getAttribute("satu"), 70);
        localStorage.setItem(value.getAttribute("bright"), 120);
        valueSet()
      });  

      parseOptions();
      loopOptions("/")
    });

    content.append(resetButton);
    content.append(saveButton);

    const issueButton = document.createElement("a");
    issueButton.classList.add("issue-button");
    issueButton.innerHTML = "Report Issue";
    issueButton.href = "https://github.com/Astromations/Hazy/issues";
    content.append(issueButton);

    Spicetify.PopupModal.display({ title: "Hazy Settings", content: content });
  });
  homeEdit.element.classList.toggle("hidden", false);

  // startup parse
  loopOptions("/");
})()
