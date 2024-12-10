(function hazy() {
  if (!(Spicetify.Player.data && Spicetify.Platform)) {
    setTimeout(hazy, 100);
    return;
  }

  console.log("Hazy is running");

  function getAlbumInfo(uri) {
    return Spicetify.CosmosAsync.get(
      `https://api.spotify.com/v1/albums/${uri}`
    );
  }

  function valueSet() {
    // Check if blurValue is NaN
    const blurValue = Number.parseInt(localStorage.getItem("blurAmount"));
    const contValue = Number.parseInt(localStorage.getItem("contAmount"));
    const satuValue = Number.parseInt(localStorage.getItem("satuAmount"));
    const brightValue = Number.parseInt(localStorage.getItem("brightAmount"));

    if (!Number.isNaN(blurValue)) {
      document.documentElement.style.setProperty("--blur", `${blurValue}px`);
    } else {
      document.documentElement.style.setProperty("--blur", "15px");
    }

    if (!Number.isNaN(contValue)) {
      document.documentElement.style.setProperty("--cont", `${contValue}%`);
    } else {
      document.documentElement.style.setProperty("--cont", "50%");
    }

    if (!Number.isNaN(satuValue)) {
      document.documentElement.style.setProperty("--satu", `${satuValue}%`);
    } else {
      document.documentElement.style.setProperty("--satu", "70%");
    }

    if (!Number.isNaN(brightValue)) {
      document.documentElement.style.setProperty("--bright", `${brightValue}%`);
    } else {
      document.documentElement.style.setProperty("--bright", "120%");
    }
  }

  valueSet();

  async function fetchFadeTime() {
    /* It seems that ._prefs isnt available anymore. Therefore the crossfade is being disabled for now.
    const response = await Spicetify.Platform.PlayerAPI._prefs.get({ key: "audio.crossfade_v2" });
    const crossfadeEnabled = response.entries["audio.crossfade_v2"].bool;
    */
    const crossfadeEnabled = false;

    let FadeTime = "0.4s"; // Default value of 0.4 seconds, otherwise syncs with crossfade time

    if (crossfadeEnabled) {
      /*const fadeTimeResponse = await Spicetify.Platform.PlayerAPI._prefs.get({ key: "audio.crossfade.time_v2" });
      const fadeTime = fadeTimeResponse.entries["audio.crossfade.time_v2"].number;*/
      const fadeTime = FadeTime;
      const dividedTime = fadeTime / 1000;
      FadeTime = `${dividedTime}s`;
    }

    document.documentElement.style.setProperty("--fade-time", FadeTime);
    console.log(FadeTime);
    // Use the CSS variable "--fade-time" for transition time
  }

  async function onSongChange() {
    fetchFadeTime(); // Call fetchFadeTime after songchange

    const album_uri = Spicetify.Player.data.item.metadata.album_uri;
    let bgImage = Spicetify.Player.data.item.metadata.image_url;

    if (album_uri !== undefined && !album_uri.includes("spotify:show")) {
      const albumInfo = await getAlbumInfo(
        album_uri.replace("spotify:album:", "")
      );
    } else if (Spicetify.Player.data.item.uri.includes("spotify:episode")) {
      // podcast
      bgImage = bgImage.replace("spotify:image:", "https://i.scdn.co/image/");
    } else if (Spicetify.Player.data.item.provider === "ad") {
      // ad
      return;
    } else {
      // When clicking a song from the homepage, songChange is fired with half empty metadata
      setTimeout(onSongChange, 200);
    }

    loopOptions("/");
    updateLyricsPageProperties();

    //custom code added by lily
    if (!config.useCustomColor) {
      let imageUrl;
      if (!config.useCurrSongAsHome && Spicetify.Player.data.item.metadata.image_url) {
        imageUrl = Spicetify.Player.data.item.metadata.image_url.replace("spotify:image:", "https://i.scdn.co/image/");
      } else {
        const defImage = "https://i.imgur.com/Wl2D0h0.png";
        imageUrl = localStorage.getItem("hazy:startupBg") || defImage;
      }

      changeAccentColors(imageUrl);
    } else {
      let color = localStorage.getItem("CustomColor") || "#FFC0EA";
      document.querySelector(':root').style.setProperty('--spice-button', color);
      document.querySelector(':root').style.setProperty('--spice-button-active', color);
      document.querySelector(':root').style.setProperty('--spice-accent', color);
    }
  }

  //functions added by lily
  //changes the accent colors to the most prominent color
  //in the background image when the background is changed
  //-------------------------------------

  function changeAccentColors(imageUrl) {
    getMostProminentColor(imageUrl, function (color) {
      document.querySelector(':root').style.setProperty('--spice-button', color);
      document.querySelector(':root').style.setProperty('--spice-button-active', color);
      document.querySelector(':root').style.setProperty('--spice-accent', color);
    });
  }

  function getMostProminentColor(imageUrl, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // allows CORS-enabled images

    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let rgbList = buildRgb(imageData);

      // attempt with filters
      let hexColor = findColor(rgbList);

      // retry without filters if no color is found
      if (!hexColor) {
        hexColor = findColor(rgbList, true);
      }

      callback(hexColor);
    };

    img.onerror = function () {
      console.error("Image load error");
      callback(null);
    };

    img.src = imageUrl;
  }

  //gets the most prominent color in a list of rgb values
  function findColor(rgbList, skipFilters = false) {
    const colorCount = {};
    let maxColor = '';
    let maxCount = 0;

    for (let i = 0; i < rgbList.length; i++) {
      if (!skipFilters && (isTooDark(rgbList[i]) || isTooCloseToWhite(rgbList[i]))) {
        continue;
      }

      const color = `${rgbList[i].r},${rgbList[i].g},${rgbList[i].b}`;
      colorCount[color] = (colorCount[color] || 0) + 1;

      if (colorCount[color] > maxCount) {
        maxColor = color;
        maxCount = colorCount[color];
      }
    }

    if (maxColor) {
      const [r, g, b] = maxColor.split(',').map(Number);
      return rgbToHex(r, g, b);
    } else {
      return null; // no color found
    }
  }

  //creates a list of rgb values from image data
  const buildRgb = (imageData) => {
    const rgbValues = [];
    // note that we are loopin every 4!
    // for every Red, Green, Blue and Alpha
    for (let i = 0; i < imageData.length; i += 4) {
      const rgb = {
        r: imageData[i],
        g: imageData[i + 1],
        b: imageData[i + 2],
      };

      rgbValues.push(rgb);
    }

    return rgbValues;
  };

  //converts RGB to Hex
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  //checks if a color is too dark
  function isTooDark(rgb) {
    const brightness = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    const threshold = 100; // adjust this value to control the "darkness" threshold
    return brightness < threshold;
  }

  //checks if a color is too close to white
  function isTooCloseToWhite(rgb) {
    const threshold = 200;
    return rgb.r > threshold && rgb.g > threshold && rgb.b > threshold;
  }

  //-------------------------------------

  Spicetify.Player.addEventListener("songchange", onSongChange);
  onSongChange();
  windowControls();
  galaxyFade();

  function scrollToTop() {
    const element = document.querySelector(".main-entityHeader-container");
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", (event) => {
    const clickedElement = event.target;
    if (clickedElement.closest(".main-entityHeader-topbarTitle")) {
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
      "enablePanelSizeCoordination",
    ];

    if (!localStorage.getItem("Hazy Sidebar Activated")) {
      localStorage.setItem("Hazy Sidebar Activated", true);
      for (const feature of features) {
        // Ignore if feature not present
        if (!parsedObject[feature]) continue;

        // Change value if disabled
        if (!parsedObject[feature].value) {
          parsedObject[feature].value = true;
          reload = true;
        }
      }
    }

    localStorage.setItem(
      "spicetify-exp-features",
      JSON.stringify(parsedObject)
    );
    if (reload) {
      window.location.reload();
      reload = false;
    }
  })();

  function windowControls() {
    function detectOS() {
      const userAgent = window.navigator.userAgent;

      if (userAgent.indexOf("Win") !== -1) {
        document.body.classList.add("windows");
      }
    }

    // Call detectOS() immediately
    detectOS();
  }

  /* Transparent Controls */
  function addTransparentControls(height, width) {
    document.documentElement.style.setProperty(
      "--control-height",
      `${height}px`
    );
    document.documentElement.style.setProperty("--control-width", `${width}px`);
  }

  async function setMainWindowControlHeight(height) {
    await Spicetify.CosmosAsync.post("sp://messages/v1/container/control", {
      type: "update_titlebar",
      height: height,
    });
  }

  // Window Zoom Variable
  function updateZoomVariable() {
    let prevOuterWidth = window.outerWidth;
    let prevInnerWidth = window.innerWidth;
    let prevRatio = window.devicePixelRatio;

    function calculateAndApplyZoom() {
      const newOuterWidth = window.outerWidth;
      const newInnerWidth = window.innerWidth;
      const newRatio = window.devicePixelRatio;

      if (
        prevOuterWidth <= 160 ||
        prevRatio !== newRatio ||
        prevOuterWidth !== newOuterWidth ||
        prevInnerWidth !== newInnerWidth
      ) {
        const zoomFactor = newOuterWidth / newInnerWidth || 1;
        document.documentElement.style.setProperty("--zoom", zoomFactor);
        console.debug(
          `Zoom Updated: ${newOuterWidth} / ${newInnerWidth} = ${zoomFactor}`
        );

        // Update previous values
        prevOuterWidth = newOuterWidth;
        prevInnerWidth = newInnerWidth;
        prevRatio = newRatio;
      }
    }

    calculateAndApplyZoom();
    window.addEventListener("resize", calculateAndApplyZoom);
  }

  updateZoomVariable();

  function waitForElement(elements, func, timeout = 100) {
    const queries = elements.map((element) => document.querySelector(element));
    if (queries.every((a) => a)) {
      func(queries);
    } else if (timeout > 0) {
      setTimeout(waitForElement, 300, elements, func, timeout - 1);
    }
  }

  function getAndApplyNav(element) {
    const isCenteredGlobalNav = Spicetify.Platform.version >= "1.2.46.462";

    document.body.classList.add(
      `${
        element?.[0]?.classList.contains("Root__globalNav")
          ? isCenteredGlobalNav
            ? "global-nav-centered"
            : "global-nav"
          : "control-nav"
      }`
    );
  }

  waitForElement([".Root__globalNav"], getAndApplyNav, 10000);

  Spicetify.Platform.History.listen(updateLyricsPageProperties);

  waitForElement([".Root__lyrics-cinema"], ([lyricsCinema]) => {
    const lyricsCinemaObserver = new MutationObserver(
      updateLyricsPageProperties
    );
    const lyricsCinemaObserverConfig = {
      attributes: true,
      attributeFilter: ["class"],
    };
    lyricsCinemaObserver.observe(lyricsCinema, lyricsCinemaObserverConfig);
  });

  waitForElement([".main-view-container"], ([mainViewContainer]) => {
    const mainViewContainerResizeObserver = new ResizeObserver(
      updateLyricsPageProperties
    );
    mainViewContainerResizeObserver.observe(mainViewContainer);
  });

  // fixes container shifting & active line clipping | taken from Bloom: https://github.com/nimsandu/spicetify-bloom
  function updateLyricsPageProperties() {
    function setLyricsPageProperties() {
      function detectTextDirection() {
        // 0, 1 - blank lines
        const lyric = document.querySelectorAll(
          ".lyrics-lyricsContent-lyric"
        )[2];
        const rtl_rx = /[\u0591-\u07FF]/;
        return rtl_rx.test(lyric.innerText) ? "rtl" : "ltr";
      }

      function setLyricsTransformOrigin(textDirection) {
        if (textDirection === "rtl") {
          document.documentElement.style.setProperty(
            "--lyrics-text-direction",
            "right"
          );
        } else {
          document.documentElement.style.setProperty(
            "--lyrics-text-direction",
            "left"
          );
        }
      }

      function calculateLyricsMaxWidth(lyricsContentWrapper) {
        const lyricsContentContainer = lyricsContentWrapper.parentElement;
        const marginLeft = Number.parseInt(
          window.getComputedStyle(lyricsContentWrapper).marginLeft,
          10
        );
        const totalOffset = lyricsContentWrapper.offsetLeft + marginLeft;
        return Math.round(
          0.95 * (lyricsContentContainer.clientWidth - totalOffset)
        );
      }

      function lockLyricsWrapperWidth(lyricsWrapper) {
        const lyricsWrapperWidth = lyricsWrapper.getBoundingClientRect().width;
        lyricsWrapper.style.maxWidth = `${lyricsWrapperWidth}px`;
        lyricsWrapper.style.width = `${lyricsWrapperWidth}px`;
      }

      waitForElement(
        [".lyrics-lyrics-contentWrapper"],
        ([lyricsContentWrapper]) => {
          lyricsContentWrapper.style.maxWidth = "";
          lyricsContentWrapper.style.width = "";

          const lyricsTextDirection = detectTextDirection();
          setLyricsTransformOrigin(lyricsTextDirection);
          const lyricsMaxWidth = calculateLyricsMaxWidth(lyricsContentWrapper);
          document.documentElement.style.setProperty(
            "--lyrics-active-max-width",
            `${lyricsMaxWidth}px`
          );
          lockLyricsWrapperWidth(lyricsContentWrapper);
        }
      );
    }

    function lyricsCallback(mutationsList, lyricsObserver) {
      for (const mutation of mutationsList) {
        for (addedNode of mutation.addedNodes) {
          if (addedNode.classList?.contains("lyrics-lyricsContent-provider")) {
            setLyricsPageProperties();
          }
        }
      }
      lyricsObserver.disconnect;
    }

    waitForElement(
      [".lyrics-lyricsContent-provider"],
      ([lyricsContentProvider]) => {
        const lyricsContentWrapper = lyricsContentProvider.parentElement;
        setLyricsPageProperties();
        const lyricsObserver = new MutationObserver(lyricsCallback);
        const lyricsObserverConfig = { childList: true };
        lyricsObserver.observe(lyricsContentWrapper, lyricsObserverConfig);
      }
    );
  }

  function galaxyFade() {
    //Borrowed from the Galaxy theme | https://github.com/harbassan/spicetify-galaxy/
    // add fade and dimness effects to mainview and the the artist image on scroll
    waitForElement(
      [".Root__main-view [data-overlayscrollbars-viewport]"],
      ([scrollNode]) => {
        scrollNode.addEventListener("scroll", () => {
          //artist fade
          const scrollValue = scrollNode.scrollTop;
          const artist_fade = Math.max(0, (-0.3 * scrollValue + 100) / 100);
          document.documentElement.style.setProperty(
            "--artist-fade",
            artist_fade
          );

          const fadeDirection =
            scrollNode.scrollTop === 0
              ? "bottom"
              : scrollNode.scrollHeight -
                  scrollNode.scrollTop -
                  scrollNode.clientHeight ===
                0
              ? "top"
              : "full";
          scrollNode.setAttribute("fade", fadeDirection);

          // fade
          if (scrollNode.scrollTop === 0) {
            scrollNode.setAttribute("fade", "bottom");
          } else if (
            scrollNode.scrollHeight -
              scrollNode.scrollTop -
              scrollNode.clientHeight ===
            0
          ) {
            scrollNode.setAttribute("fade", "top");
          } else {
            scrollNode.setAttribute("fade", "full");
          }
        });
      }
    );

    waitForElement(
      [".Root__nav-bar [data-overlayscrollbars-viewport]"],
      ([scrollNode]) => {
        scrollNode.setAttribute("fade", "bottom");
        scrollNode.addEventListener("scroll", () => {
          // fade
          if (scrollNode.scrollTop === 0) {
            scrollNode.setAttribute("fade", "bottom");
          } else if (
            scrollNode.scrollHeight -
              scrollNode.scrollTop -
              scrollNode.clientHeight ===
            0
          ) {
            scrollNode.setAttribute("fade", "top");
          } else {
            scrollNode.setAttribute("fade", "full");
          }
        });
      }
    );
  }

  const config = {};

  function parseOptions() {
    config.useCurrSongAsHome = JSON.parse(
      localStorage.getItem("UseCustomBackground")
    );

    //save the selected custom color 
    //to the config (added by lily)
    //-------------------------
    config.useCustomColor = JSON.parse(
      localStorage.getItem("UseCustomColor")
    );
    //-------------------------
  }

  parseOptions();

  function loopOptions(page) {
    if (page === "/") {
      if (config.useCurrSongAsHome) {
        document.documentElement.style.setProperty(
          "--image_url",
          `url("${startImage}")`
        );
      } else {
        const bgImage = Spicetify.Player.data.item.metadata.image_url;
        document.documentElement.style.setProperty(
          "--image_url",
          `url("${bgImage}")`
        );
      }
    }
  }

  const defImage = "https://i.imgur.com/Wl2D0h0.png";
  let startImage = localStorage.getItem("hazy:startupBg") || defImage;

  // input for custom background images
  const bannerInput = document.createElement("input");
  bannerInput.type = "file";
  bannerInput.className = "banner-input";
  bannerInput.accept = [
    "image/jpeg",
    "image/apng",
    "image/avif",
    "image/gif",
    "image/png",
    "image/svg+xml",
    "image/webp",
  ].join(",");

  // listen for edit playlist popup
  const editObserver = new MutationObserver((mutation_list) => {
    for (const mutation of mutation_list) {
      if (mutation.addedNodes.length) {
        const popupContent = mutation.addedNodes[0].querySelector(
          ".main-trackCreditsModal-container"
        );
        if (!popupContent) continue;

        const coverSelect = popupContent.querySelector(
          ".main-playlistEditDetailsModal-albumCover"
        );
        const bannerSelect = coverSelect.cloneNode(true);
        bannerSelect.id = "banner-select";

        const [, , uid] =
          Spicetify.Platform.History.location.pathname.split("/");

        const srcInput = document.createElement("input");
        srcInput.type = "text";
        srcInput.classList.add(
          "main-playlistEditDetailsModal-textElement",
          "main-playlistEditDetailsModal-titleInput"
        );
        srcInput.id = "src-input";
        srcInput.placeholder = "Background image URL (recommended)";

        const optButton = bannerSelect.querySelector(
          ".main-playlistEditDetailsModal-imageDropDownButton"
        );
        optButton.querySelector("svg").children[0].remove();
        optButton
          .querySelector("svg")
          .append(
            document
              .querySelector(".main-playlistEditDetailsModal-closeBtn path")
              .cloneNode()
          );

        optButton.onclick = () => {
          localStorage.removeItem(`hazy:playlistBg:${uid}`);
          bannerSelect.querySelector("img").src =
            coverSelect.querySelector("img").src;
        };

        popupContent.append(bannerSelect);
        popupContent.append(bannerInput);
        popupContent.append(srcInput);

        const editButton = bannerSelect.querySelector(
          ".main-editImageButton-image.main-editImageButton-overlay"
        );
        editButton.onclick = () => {
          bannerInput.click();
        };

        const save = popupContent.querySelector(
          ".main-playlistEditDetailsModal-save button"
        );
        save.addEventListener("click", () => {
          if (srcInput.value) {
            localStorage.setItem(`hazy:playlistBg:${uid}`, srcInput.value);
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
    reader.onload = (event) => {
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
          localStorage.setItem(`hazy:playlistBg:${uid}`, result);
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
    }

    function setValue(blur_am, cont, satu, bright, desc) {
      const valueRow = document.createElement("div");
      const blur_val = localStorage.getItem(blur_am) || "15";
      const cont_val = localStorage.getItem(cont) || "50";
      const satu_val = localStorage.getItem(satu) || "70";
      const bright_val = localStorage.getItem(bright) || "120";

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

      valueRow.querySelector("#blur-value").addEventListener("input", () => {
        let content = valueRow.querySelector("#blur-value").textContent.trim();
        const number = Number.parseInt(content);
        if (content.length > 3) {
          content = valueRow.querySelector("#blur-value").textContent =
            content.slice(0, 3); // Truncate the content to 3 characters
        }
        valueRow.querySelector("#blur-input").value = number;
      });

      valueRow.querySelector("#cont-value").addEventListener("input", () => {
        let content = valueRow.querySelector("#cont-value").textContent.trim();
        const number = Number.parseInt(content);
        if (content.length > 3) {
          content = valueRow.querySelector("#cont-value").textContent =
            content.slice(0, 3); // Truncate the content to 3 characters
        }
        valueRow.querySelector("#cont-input").value = number;
      });

      valueRow.querySelector("#satu-value").addEventListener("input", () => {
        let content = valueRow.querySelector("#satu-value").textContent.trim();
        const number = Number.parseInt(content);
        if (content.length > 3) {
          content = valueRow.querySelector("#satu-value").textContent =
            content.slice(0, 3); // Truncate the content to 3 characters
        }
        valueRow.querySelector("#satu-input").value = number;
      });

      valueRow.querySelector("#bright-value").addEventListener("input", () => {
        let content = valueRow
          .querySelector("#bright-value")
          .textContent.trim();
        const number = Number.parseInt(content);
        if (content.length > 3) {
          content = valueRow.querySelector("#bright-value").textContent =
            content.slice(0, 3); // Truncate the content to 3 characters
        }
        valueRow.querySelector("#bright-input").value = number;
      });

      valueRow.querySelector("#blur-input").addEventListener("input", () => {
        valueRow.querySelector("#blur-value").textContent =
          valueRow.querySelector("#blur-input").value;
      });

      valueRow.querySelector("#cont-input").addEventListener("input", () => {
        valueRow.querySelector("#cont-value").textContent =
          valueRow.querySelector("#cont-input").value;
      });

      valueRow.querySelector("#satu-input").addEventListener("input", () => {
        valueRow.querySelector("#satu-value").textContent =
          valueRow.querySelector("#satu-input").value;
      });

      valueRow.querySelector("#bright-input").addEventListener("input", () => {
        valueRow.querySelector("#bright-value").textContent =
          valueRow.querySelector("#bright-input").value;
      });

      valueSet();

      valueList.appendChild(valueRow);
      valueRow.setAttribute("blur_am", blur_am);
      valueRow.setAttribute("cont", cont);
      valueRow.setAttribute("satu", satu);
      valueRow.setAttribute("bright", bright);
    }

    const srcInput = document.createElement("input");
    srcInput.type = "text";
    srcInput.classList.add(
      "main-playlistEditDetailsModal-textElement",
      "main-playlistEditDetailsModal-titleInput"
    );
    srcInput.id = "src-input";
    srcInput.placeholder =
      "Background image URL (recommended due to size limits)";
    if (!startImage.startsWith("data:image")) {
      srcInput.value = startImage;
    }
    content.append(srcInput);

    createOption("UseCustomBackground", "Custom background:", false);
    setValue("blurAmount", "contAmount", "satuAmount", "brightAmount", " ");

    //additional settings (added by lily)
    //-------------------

    //color label
    const colorLabel = document.createElement("label");
    colorLabel.id = "color-label";
    colorLabel.htmlFor = "color";
    colorLabel.textContent = "Color:";
    colorLabel.style.textAlign = "right";
    colorLabel.style.marginRight = "10px";
    colorLabel.style.fontSize = "0.875rem";
    optionList.append(colorLabel);

    //color picker
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.id = "color-input";
    colorInput.value = localStorage.getItem("CustomColor") || "#30bf63";
    colorInput.style.border = "none";
    optionList.append(colorInput);

    //color toggle
    createOption("UseCustomColor", "Custom color:", true);

    //-------------------

    content.append(optionList);
    content.append(valueList);

    img = content.querySelector("img");
    img.src = localStorage.getItem("hazy:startupBg") || defImage;
    const editButton = content.querySelector(
      ".main-editImageButton-image.main-editImageButton-overlay"
    );
    editButton.onclick = () => {
      bannerInput.click();
    };
    const removeButton = content.querySelector(
      ".main-playlistEditDetailsModal-imageDropDownButton"
    );
    removeButton.onclick = () => {
      content.querySelector("img").src = defImage;
    };

    const resetButton = document.createElement("button");
    resetButton.id = "value-reset";
    resetButton.innerHTML = "Reset";

    const saveButton = document.createElement("button");
    saveButton.id = "home-save";
    saveButton.innerHTML = "Apply";

    saveButton.addEventListener("click", () => {
      // update changed bg image
      startImage = srcInput.value || content.querySelector("img").src;
      localStorage.setItem("hazy:startupBg", startImage);

      //save the selected custom color (added by lily)
      //-------------------------
      let colorElem = document.getElementById("color-input");
      localStorage.setItem("CustomColor", colorElem.value);
      //-------------------------

      onSongChange();

      // save options to local storage
      for (const option of [...optionList.children]) {

        //ignore the color changing options
        //as they are handled differently (added by lily)
        //-------------------------
        if (option.id == "color-input" || option.id == "color-label") {
          continue;
        }
        //-------------------------

        localStorage.setItem(
          option.getAttribute("name"),
          option.querySelector(".toggle").classList.contains("enabled")
        );
        console.log(
          `hazy: ${option.getAttribute("name")} set to ${option
            .querySelector(".toggle")
            .classList.contains("enabled")}`
        );
      }

      for (const value of [...valueList.children]) {
        const blurValueInput = value.querySelector("#blur-input");
        const contValueInput = value.querySelector("#cont-input");
        const satuValueInput = value.querySelector("#satu-input");
        const brightValueInput = value.querySelector("#bright-input");

        localStorage.setItem(
          value.getAttribute("blur_am"),
          blurValueInput.value
        );
        localStorage.setItem(value.getAttribute("cont"), contValueInput.value);
        localStorage.setItem(value.getAttribute("satu"), satuValueInput.value);
        localStorage.setItem(
          value.getAttribute("bright"),
          brightValueInput.value
        );

        valueSet();
      }

      parseOptions();
      loopOptions("/");
    });

    resetButton.addEventListener("click", () => {
      for (const value of [...valueList.children]) {
        document.querySelector(".hazyOptionRow #blur-input").value = 15;
        document.querySelector(".hazyOptionRow #cont-input").value = 50;
        document.querySelector(".hazyOptionRow #satu-input").value = 70;
        document.querySelector(".hazyOptionRow #bright-input").value = 120;

        document.querySelector(".hazyOptionRow #blur-value").textContent = "15";
        document.querySelector(".hazyOptionRow #cont-value").textContent = "50";
        document.querySelector(".hazyOptionRow #satu-value").textContent = "70";
        document.querySelector(".hazyOptionRow #bright-value").textContent =
          "120";

        localStorage.setItem(value.getAttribute("blur_am"), 8);
        localStorage.setItem(value.getAttribute("cont"), 50);
        localStorage.setItem(value.getAttribute("satu"), 70);
        localStorage.setItem(value.getAttribute("bright"), 120);
        valueSet();
      }

      parseOptions();
      loopOptions("/");
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
})();
