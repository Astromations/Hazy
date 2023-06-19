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

  waitForElement(['span.main-entityHeader-topbarTitle'], (scrollToElement) => {
    const spanElement = document.querySelector('span.main-entityHeader-topbarTitle');
    const elementToScroll = document.querySelector('.contentSpacing');
    const scrollOptions = {
      behavior: 'smooth',
      block: 'start'
    };
  
    function scrollToElement() {
      elementToScroll.scrollIntoView(scrollOptions);
    }
  
    spanElement.addEventListener('click', scrollToElement);  
  });

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
      const valueRow = document.createElement("div");
      const blur_val = localStorage.getItem(blur_am);
      const cont_val = localStorage.getItem(cont);
      const satu_val = localStorage.getItem(satu);
      const bright_val = localStorage.getItem(bright);
    
      valueRow.classList.add("hazyOptionRow");
      valueRow.innerHTML = `
      <div class="blur-amount" style='width: 100%'>
      <p>${desc}</p>
      <div>
        <label for="blur-input">Blur:</label>
        <input id="blur-input" type="number" min="0" max="100" value="${blur_val}" placeholder="15">
      </div>
      <div>
        <label for="cont-input">Contrast:</label>
        <input id="cont-input" type="number" min="0" max="999" value="${cont_val}" placeholder="50">
      </div>
      <div>
        <label for="satu-input">Saturation:</label>
        <input id="satu-input" type="number" min="0" max="999" value="${satu_val}" placeholder="70">
      </div>
      <div>
        <label for="bright-input">Brightness:</label>
        <input id="bright-input" type="number" min="0" max="999" value="${bright_val}" placeholder="120">
      </div>
    </div>`;
    
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
