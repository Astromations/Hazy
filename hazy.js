(function hazy() {
  if (!(Spicetify.Player.data && Spicetify.Platform)) {
    setTimeout(hazy, 100);
    return;
  }

  const defImage = "https://i.imgur.com/Wl2D0h0.png";
  let startImage = localStorage.getItem("hazy:startupBg") || defImage;
  const toggleInfo = [
    {
      id: "UseCustomBackground",
      name: "Custom background",
      defVal: false,
    },
    {
      id: "UseCustomColor",
      name: "Custom color",
      defVal: true,
    },
  ];
  const toggles = {
    UseCustomBackground: false,
    UseCustomColor: true,
  };
  const sliders = [
    {
      id: "blur",
      name: "Blur",
      min: 0,
      max: 50,
      step: 1,
      defVal: 15,
      end: "px",
    },
    { id: "cont", name: "Contrast", min: 0, max: 200, step: 2, defVal: 50 },
    { id: "satu", name: "Saturation", min: 0, max: 200, step: 2, defVal: 70 },
    {
      id: "bright",
      name: "Brightness",
      min: 0,
      max: 200,
      step: 2,
      defVal: 120,
    },
  ];

  (function sidebar() {
    if (localStorage.getItem("Hazy Sidebar Activated")) return;
    // Sidebar settings
    const parsedObject = JSON.parse(
      localStorage.getItem("spicetify-exp-features")
    );

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

    for (const feature of features) {
      // Ignore if feature not present
      if (!parsedObject[feature]) continue;

      // Change value if disabled
      if (!parsedObject[feature].value) {
        parsedObject[feature].value = true;
        reload = true;
      }
    }

    localStorage.setItem(
      "spicetify-exp-features",
      JSON.stringify(parsedObject)
    );
    localStorage.setItem("Hazy Sidebar Activated", true);
    if (reload) {
      window.location.reload();
      reload = false;
    }
  })();

  function loadSliders() {
    sliders.forEach((opt) => {
      const val = localStorage.getItem(`${opt.id}Amount`) || opt.defVal;
      document.documentElement.style.setProperty(
        `--${opt.id}`,
        `${val}${opt.end || "%"}`
      );
    });
  }

  function setAccentColor(color) {
    document.querySelector(":root").style.setProperty("--spice-button", color);
    document
      .querySelector(":root")
      .style.setProperty("--spice-button-active", color);
    document.querySelector(":root").style.setProperty("--spice-accent", color);
  }

  async function fetchFadeTime() {
    try {
      const response = await Spicetify.Platform.PlayerAPI._prefs.get({
        key: "audio.crossfade_v2",
      });

      // Default to 0.4s if crossfade is disabled
      if (!response.entries["audio.crossfade_v2"].bool) {
        document.documentElement.style.setProperty("--fade-time", "0.4s");
        return;
      }
      const fadeTimeResponse = await Spicetify.Platform.PlayerAPI._prefs.get({
        key: "audio.crossfade.time_v2",
      });
      const fadeTime =
        fadeTimeResponse.entries["audio.crossfade.time_v2"].number;

      // Use the CSS variable "--fade-time" for transition time
      document.documentElement.style.setProperty(
        "--fade-time",
        `${fadeTime / 1000}s`
      );
    } catch (error) {
      document.documentElement.style.setProperty("--fade-time", "0.4s");
    }
  }

  function getCurrentBackground(replace) {
    let url = Spicetify.Player.data.item.metadata.image_url;
    if (replace)
      url = url.replace("spotify:image:", "https://i.scdn.co/image/");
    if (toggles.UseCustomBackground || !URL.canParse(url)) return startImage;
    return url;
  }

  async function onSongChange() {
    fetchFadeTime();

    const album_uri = Spicetify.Player.data.item.metadata.album_uri;
    if (album_uri !== undefined && !album_uri.includes("spotify:show")) {
      // Album
    } else if (Spicetify.Player.data.item.uri.includes("spotify:episode")) {
      // Podcast
    } else if (Spicetify.Player.data.item.isLocal) {
      // Local file
    } else if (Spicetify.Player.data.item.provider === "ad") {
      // Ad
      return;
    } else {
      // When clicking a song from the homepage, songChange is fired with half empty metadata
      setTimeout(onSongChange, 200);
    }

    updateLyricsPageProperties();

    // Custom code added by lily
    if (!toggles.UseCustomColor) {
      // Get the accent color from the background image
      const img = new Image();
      // Allows CORS-enabled images
      img.crossOrigin = "Anonymous";

      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;

        const rgbList = [];
        // Note that we are looping every 4 (red, green, blue and alpha)
        for (let i = 0; i < imageData.length; i += 4)
          rgbList.push({
            r: imageData[i],
            g: imageData[i + 1],
            b: imageData[i + 2],
          });

        // Attempt with filters
        let hexColor = findColor(rgbList);

        // Retry without filters if no color is found
        if (!hexColor) hexColor = findColor(rgbList, true);

        setAccentColor(hexColor);
      };

      img.onerror = function () {
        console.error("Image load error");
      };

      img.src = getCurrentBackground(true);
    } else {
      setAccentColor(localStorage.getItem("CustomColor") || "#ffc0ea");
    }

    // Update background
    document.documentElement.style.setProperty(
      "--image_url",
      `url("${getCurrentBackground(false)}")`
    );
  }

  // Gets the most prominent color in a list of RGB values
  function findColor(rgbList, skipFilters = false) {
    const colorCount = {};
    let maxColor = "";
    let maxCount = 0;

    for (let i = 0; i < rgbList.length; i++) {
      if (
        !skipFilters &&
        (isTooDark(rgbList[i]) || isTooCloseToWhite(rgbList[i]))
      ) {
        continue;
      }

      const color = `${rgbList[i].r},${rgbList[i].g},${rgbList[i].b}`;
      colorCount[color] = (colorCount[color] || 0) + 1;

      if (colorCount[color] > maxCount) {
        maxColor = color;
        maxCount = colorCount[color];
      }
    }

    return maxColor ? rgbToHex(...maxColor.split(",").map(Number)) : null;
  }

  // Converts RGB to Hex
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  // Checks if a color is too dark
  function isTooDark(rgb) {
    const brightness = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    // Adjust this value to control the "darkness" threshold
    const threshold = 100;
    return brightness < threshold;
  }

  // Checks if a color is too close to white
  function isTooCloseToWhite(rgb) {
    const threshold = 200;
    return rgb.r > threshold && rgb.g > threshold && rgb.b > threshold;
  }

  loadSliders();
  loadToggles();
  Spicetify.Player.addEventListener("songchange", onSongChange);
  if (window.navigator.userAgent.indexOf("Win") !== -1)
    document.body.classList.add("windows");
  galaxyFade();

  function scrollToTop() {
    const element = document.querySelector(".main-entityHeader-container");
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".main-entityHeader-topbarTitle")) scrollToTop();
  });

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

  waitForElement(
    [".Root__globalNav"],
    (element) => {
      const isCenteredGlobalNav = Spicetify.Platform.version >= "1.2.46.462";
      let addedClass = "control-nav";
      if (element?.[0]?.classList.contains("Root__globalNav"))
        addedClass = isCenteredGlobalNav ? "global-nav-centered" : "global-nav";
      document.body.classList.add(addedClass);
    },
    10000
  );

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

  // Fixes container shifting & active line clipping
  // Taken from Bloom | https://github.com/nimsandu/spicetify-bloom
  function updateLyricsPageProperties() {
    function setLyricsPageProperties() {
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

      waitForElement(
        [".lyrics-lyrics-contentWrapper"],
        ([lyricsContentWrapper]) => {
          lyricsContentWrapper.style.maxWidth = "";
          lyricsContentWrapper.style.width = "";

          // 0, 1 - blank lines
          const lyric = document.querySelector(
            ".lyrics-lyricsContent-lyric"
          )[2];
          document.documentElement.style.setProperty(
            "--lyrics-text-direction",
            /[\u0591-\u07FF]/.test(lyric.innerText) ? "right" : "left"
          );

          document.documentElement.style.setProperty(
            "--lyrics-active-max-width",
            `${calculateLyricsMaxWidth(lyricsContentWrapper)}px`
          );

          // Lock lyrics wrapper width
          const lyricsWrapperWidth =
            lyricsContentWrapper.getBoundingClientRect().width;
          lyricsContentWrapper.style.maxWidth = `${lyricsWrapperWidth}px`;
          lyricsContentWrapper.style.width = `${lyricsWrapperWidth}px`;
        }
      );
    }

    function lyricsCallback(mutationsList, lyricsObserver) {
      for (const mutation of mutationsList)
        for (addedNode of mutation.addedNodes)
          if (addedNode.classList?.contains("lyrics-lyricsContent-provider"))
            setLyricsPageProperties();
      lyricsObserver.disconnect;
    }

    waitForElement(
      [".lyrics-lyricsContent-provider"],
      ([lyricsContentProvider]) => {
        setLyricsPageProperties();
        const lyricsObserver = new MutationObserver(lyricsCallback);
        lyricsObserver.observe(lyricsContentProvider.parentElement, {
          childList: true,
        });
      }
    );
  }

  function setFadeDirection(scrollNode) {
    let fadeDirection = "full";
    if (scrollNode.scrollTop === 0) {
      fadeDirection = "bottom";
    } else if (
      scrollNode.scrollHeight -
        scrollNode.scrollTop -
        scrollNode.clientHeight ===
      0
    ) {
      fadeDirection = "top";
    }
    scrollNode.setAttribute("fade", fadeDirection);
  }

  // Add fade and dimness effects to mainview and the artist image on scroll
  // Taken from Galaxy | https://github.com/harbassan/spicetify-galaxy/
  function galaxyFade() {
    const setupFade = (selector, onScrollCallback) => {
      waitForElement([selector], ([scrollNode]) => {
        let ticking = false;

        scrollNode.addEventListener("scroll", () => {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              onScrollCallback(scrollNode);
              ticking = false;
            });
            ticking = true;
          }
        });

        // Initial trigger
        onScrollCallback(scrollNode);
      });
    };

    // Apply artist fade function
    const applyArtistFade = (scrollNode) => {
      const scrollValue = scrollNode.scrollTop;
      const fadeValue = Math.max(0, (-0.3 * scrollValue + 100) / 100);
      document.documentElement.style.setProperty("--artist-fade", fadeValue);
    };

    // Main view - apply artist fade + fade direction
    setupFade(
      ".Root__main-view [data-overlayscrollbars-viewport]",
      (scrollNode) => {
        applyArtistFade(scrollNode);
        setFadeDirection(scrollNode);
      }
    );

    // Nav bar - fade direction only
    setupFade(
      ".Root__nav-bar [data-overlayscrollbars-viewport]",
      (scrollNode) => {
        scrollNode.setAttribute("fade", "bottom");
        setFadeDirection(scrollNode);
      }
    );

    // Right sidebar - fade direction only
    setupFade(
      ".Root__right-sidebar [data-overlayscrollbars-viewport]",
      (scrollNode) => {
        scrollNode.setAttribute("fade", "bottom");
        setFadeDirection(scrollNode);
      }
    );
  }

  function loadToggles() {
    toggles.UseCustomBackground = JSON.parse(
      localStorage.getItem("UseCustomBackground")
    );
    toggles.UseCustomColor = JSON.parse(localStorage.getItem("UseCustomColor"));
    onSongChange();
  }

  // Input for custom background images
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

  // When user selects a custom background image
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
      }
    };
    reader.readAsDataURL(file);
  };

  // Create edit home topbar button
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

    function createToggle(opt) {
      let { id, name, defVal } = opt;
      const toggleRow = document.createElement("div");
      toggleRow.classList.add("hazyOptionRow");
      toggleRow.innerHTML = `
      <span class="hazyOptionDesc">${name}:</span>
      <button class="hazyOptionToggle">
        <span class="toggleWrapper">
          <span class="toggle"></span>
        </span>
      </button>`;
      toggleRow.setAttribute("name", id);
      toggleRow
        .querySelector("button")
        .addEventListener("click", () =>
          toggleRow.querySelector(".toggle").classList.toggle("enabled")
        );
      const isEnabled = JSON.parse(localStorage.getItem(id)) ?? defVal;
      toggleRow.querySelector(".toggle").classList.toggle("enabled", isEnabled);
      content.append(toggleRow);
    }

    function createSlider(opt) {
      let { id, name, min, max, step, defVal, end } = opt;
      const val = localStorage.getItem(`${id}Amount`) || defVal;
      const slider = document.createElement("div");
      slider.classList.add("hazyOptionRow");
      slider.innerHTML = `
      <div class="slider-container">
        <label for="${id}-input">${name}:</label>
        <input class="slider" id="${id}-input" type="range" min="${min}" max="${max}" step="${step}" value="${val}">
        <div class="slider-value">
          <p id="${id}-value" contenteditable="true" >${val}${end || "%"}</p>
        </div>
      </div>`;
      slider.querySelector(`#${id}-value`).addEventListener("input", () => {
        let content = slider.querySelector(`#${id}-value`).textContent.trim();
        const number = Number.parseInt(content);
        if (content.length > 3) {
          // Truncate the content to 3 characters
          content = slider.querySelector(`#${id}-value`).textContent =
            content.slice(0, 3);
        }
        slider.querySelector(`#${id}-input`).value = number;
      });
      slider.querySelector(`#${id}-input`).addEventListener("input", () => {
        slider.querySelector(`#${id}-value`).textContent = `${
          slider.querySelector(`#${id}-input`).value
        }${opt.end || "%"}`;
      });
      content.append(slider);
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

    toggleInfo.forEach(createToggle);

    // Additional settings (added by lily)
    const colorRow = document.createElement("div");
    colorRow.classList.add("hazyOptionRow");

    // Color label
    const colorLabel = document.createElement("label");
    colorLabel.id = "color-label";
    colorLabel.htmlFor = "color";
    colorLabel.textContent = "Color:";
    colorLabel.style.textAlign = "right";
    colorLabel.style.marginRight = "10px";
    colorLabel.style.fontSize = "0.875rem";
    colorRow.append(colorLabel);

    // Color picker
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.id = "color-input";
    colorInput.value = localStorage.getItem("CustomColor") || "#30bf63";
    colorInput.style.border = "none";
    colorRow.append(colorInput);
    content.append(colorRow);

    sliders.forEach(createSlider);
    loadSliders();

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

    const buttonsRow = document.createElement("div");
    buttonsRow.style.display = "flex";
    buttonsRow.style.paddingTop = "15px";
    buttonsRow.style.alignItems = "flex-end";

    const resetButton = document.createElement("button");
    resetButton.id = "value-reset";
    resetButton.innerHTML = "Reset";

    const saveButton = document.createElement("button");
    saveButton.id = "home-save";
    saveButton.innerHTML = "Apply";

    saveButton.onclick = () => {
      // Change the button text to "Applied!", add "applied" class, and disable the button
      saveButton.innerHTML = "Applied!";
      saveButton.classList.add("applied");
      saveButton.disabled = true;

      // Revert back to "Apply", remove "applied" class, and enable the button after a second
      setTimeout(() => {
        saveButton.innerHTML = "Apply";
        saveButton.classList.remove("applied");
        saveButton.disabled = false;
      }, 1000);

      // Update changed bg image
      startImage = srcInput.value || content.querySelector("img").src;
      localStorage.setItem("hazy:startupBg", startImage);

      // Save the selected custom color (added by lily)
      localStorage.setItem(
        "CustomColor",
        document.getElementById("color-input").value
      );

      toggleInfo.forEach((opt) =>
        localStorage.setItem(
          opt.id,
          document
            .querySelector(`.hazyOptionRow[name=${opt.id}] .toggle`)
            .classList.contains("enabled")
        )
      );
      sliders.forEach((opt) =>
        localStorage.setItem(
          opt.id + "Amount",
          document.querySelector(`.hazyOptionRow #${opt.id}-input`).value
        )
      );

      loadSliders();
      loadToggles();
    };

    resetButton.onclick = () => {
      sliders.forEach((opt) => {
        document.querySelector(`.hazyOptionRow #${opt.id}-input`).value =
          opt.defVal;
        document.querySelector(
          `.hazyOptionRow #${opt.id}-value`
        ).textContent = `${opt.defVal}${opt.end || "%"}`;
      });
      toggleInfo.forEach((opt) => {
        document
          .querySelector(`.hazyOptionRow[name=${opt.id}] .toggle`)
          .classList.toggle("enabled", opt.defVal);
      });
      document.getElementById("color-input").value = "#30bf63";
    };

    const issueButton = document.createElement("a");
    issueButton.classList.add("issue-button");
    issueButton.innerHTML = "Report Issue";
    issueButton.href = "https://github.com/Astromations/Hazy/issues";

    buttonsRow.append(issueButton, resetButton, saveButton);
    content.append(buttonsRow);

    Spicetify.PopupModal.display({ title: "Hazy Settings", content });
  });
  homeEdit.element.classList.toggle("hidden", false);
})();
