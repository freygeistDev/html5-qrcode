"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @fileoverview
 * Complete Scanner build on top of {@link Html5Qrcode}.
 * - Decode QR Code using web cam or smartphone camera
 * 
 * @author mebjas <minhazav@gmail.com>
 * 
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 * http://www.denso-wave.com/qrcode/faqpatent-e.html
 * 
 * Note: ECMA Script is not supported by all browsers. Use minified/html5-qrcode.min.js for better
 * browser support. Alternatively the transpiled code lives in transpiled/html5-qrcode.js
 */
var Html5QrcodeScanner = /*#__PURE__*/function () {
  /**
   * Creates instance of this class.
   *
   * @param {String} elementId - Id of the HTML element.
   * @param {Object} config extra configurations to tune QR code scanner.
   *  Supported Fields:
   *      - fps: expected framerate of qr code scanning. example { fps: 2 }
   *          means the scanning would be done every 500 ms.
   *      - qrbox: width of QR scanning box, this should be smaller than
   *          the width and height of the box. This would make the scanner
   *          look like this:
   *          ----------------------
   *          |********************|
   *          |******,,,,,,,,,*****|      <--- shaded region
   *          |******|       |*****|      <--- non shaded region would be
   *          |******|       |*****|          used for QR code scanning.
   *          |******|_______|*****|
   *          |********************|
   *          |********************|
   *          ----------------------
   *      - aspectRatio: Optional, desired aspect ratio for the video feed.
   *          Ideal aspect ratios are 4:3 or 16:9. Passing very wrong aspect
   *          ratio could lead to video feed not showing up.
   *      - disableFlip: Optional, if {@code true} flipped QR Code won't be
   *          scanned. Only use this if you are sure the camera cannot give
   *          mirrored feed if you are facing performance constraints.
   *      - videoConstraints: {MediaTrackConstraints}, Optional
   *          @beta(this config is not well supported yet).
   *
   *          Important: When passed this will override other parameters
   *          like 'cameraIdOrConfig' or configurations like 'aspectRatio'.
   *
   *          videoConstraints should be of type {@code MediaTrackConstraints}
   *          as defined in
   *          https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
   *          and is used to specify a variety of video or camera controls
   *          like: aspectRatio, facingMode, frameRate, etc.
   * @param {Boolean} verbose - Optional argument, if true, all logs
   *                  would be printed to console. 
   */
  function Html5QrcodeScanner(elementId, config, verbose) {
    _classCallCheck(this, Html5QrcodeScanner);

    this.elementId = elementId;
    this.config = config;
    this.verbose = verbose === true;
    this.lang = "lang" in this.config && this.config.lang == "de" ? this.config.lang : "en";

    if (!document.getElementById(elementId)) {
      throw this.lang == "de" ? "HTML-Element mit id=".concat(elementId, " nicht gefunden") : "HTML Element with id=".concat(elementId, " not found");
    }

    this.currentScanType = Html5QrcodeScanner.SCAN_TYPE_CAMERA;
    this.sectionSwapAllowed = true;
    this.section = undefined;
    this.html5Qrcode = undefined;
    this.qrCodeSuccessCallback = undefined;
    this.qrCodeErrorCallback = undefined;
  }
  /**
   * Renders the User Interface
   * 
   * @param {Function} qrCodeSuccessCallback - callback on QR Code found.
   *  Example:
   *      function(qrCodeMessage) {}
   * @param {Function} qrCodeErrorCallback - callback on QR Code parse error.
   *  Example:
   *      function(errorMessage) {}
   * 
   */


  _createClass(Html5QrcodeScanner, [{
    key: "render",
    value: function render(qrCodeSuccessCallback, qrCodeErrorCallback) {
      var _this = this;

      var $this = this;
      this.lastMatchFound = undefined; // Add wrapper to success callback.

      this.qrCodeSuccessCallback = function (message) {
        $this.__setStatus("MATCH", Html5QrcodeScanner.STATUS_SUCCESS);

        if (qrCodeSuccessCallback) {
          qrCodeSuccessCallback(message);
        } else {
          if ($this.lastMatchFound == message) {
            return;
          }

          $this.lastMatchFound = message;

          $this.__setHeaderMessage(_this.lang == "de" ? "Letzte \xDCbereinstimmung: ".concat(message) : "Last Match: ".concat(message), Html5QrcodeScanner.STATUS_SUCCESS);
        }
      }; // Add wrapper to failure callback


      this.qrCodeErrorCallback = function (error) {
        $this.__setStatus(_this.lang == "de" ? "Scannen" : "Scanning");

        if (qrCodeErrorCallback) {
          qrCodeErrorCallback(error);
        }
      };

      var container = document.getElementById(this.elementId);
      container.innerHTML = "";

      this.__createBasicLayout(container);

      this.html5Qrcode = new Html5Qrcode(this.__getScanRegionId(), this.verbose);
    }
    /**
     * Removes the QR Code scanner.
     * 
     * @returns Promise which succeeds if the cleanup is complete successfully,
     *  fails otherwise.
     */

  }, {
    key: "clear",
    value: function clear() {
      var _this2 = this;

      var $this = this;

      var emptyHtmlContainer = function emptyHtmlContainer() {
        var mainContainer = document.getElementById(_this2.elementId);

        if (mainContainer) {
          mainContainer.innerHTML = "";

          _this2.__resetBasicLayout(mainContainer);
        }
      };

      if (this.html5Qrcode) {
        return new Promise(function (resolve, reject) {
          if ($this.html5Qrcode._isScanning) {
            $this.html5Qrcode.stop().then(function (_) {
              $this.html5Qrcode.clear();
              emptyHtmlContainer();
              resolve();
            })["catch"](function (error) {
              if ($this.verbose) {
                console.error($this.lang == "de" ? "QR-Code-Scanner kann nicht gestoppt werden" : "Unable to stop qrcode scanner", error);
              }

              reject(error);
            });
          }
        });
      }
    } //#region private control methods

  }, {
    key: "__createBasicLayout",
    value: function __createBasicLayout(parent) {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;

      if ($this.config.inlineCSS) {
        parent.style.position = "relative";
        parent.style.padding = "0px";
        parent.style.border = "1px solid silver";
      } else {
        parent.classList.add("qr-reader__parent");
      }

      this.__createHeader(parent);

      var qrCodeScanRegion = document.createElement("div");

      var scanRegionId = this.__getScanRegionId();

      qrCodeScanRegion.id = scanRegionId;

      if ($this.config.inlineCSS) {
        qrCodeScanRegion.style.width = "100%";
        qrCodeScanRegion.style.minHeight = "100px";
        qrCodeScanRegion.style.textAlign = "center";
      } else {
        qrCodeScanRegion.classList.add("qr-reader__scanregion");
        qrCodeScanRegion.classList.add("qr-reader__text_center");
      }

      parent.appendChild(qrCodeScanRegion);

      this.__insertCameraScanImageToScanRegion();

      var qrCodeDashboard = document.createElement("div");

      var dashboardId = this.__getDashboardId();

      qrCodeDashboard.id = dashboardId;

      if ($this.config.inlineCSS) {
        qrCodeDashboard.style.width = "100%";
      } else {
        qrCodeDashboard.classList.add("qr-reader__dashboard");
      }

      parent.appendChild(qrCodeDashboard);

      this.__setupInitialDashboard(qrCodeDashboard);
    }
  }, {
    key: "__resetBasicLayout",
    value: function __resetBasicLayout(parent) {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;

      if ($this.config.inlineCSS) {
        parent.style.border = "none";
      } else {
        parent.classList.add("qr-reader__noborder");
      }
    }
  }, {
    key: "__setupInitialDashboard",
    value: function __setupInitialDashboard(dashboard) {
      this.__createSection(dashboard);

      this.__createSectionControlPanel();

      if ('allowFileScan' in this.config && this.config.allowFileScan) {
        this.__createSectionSwap();
      }
    }
  }, {
    key: "__createHeader",
    value: function __createHeader(dashboard) {
      var $this = this;
      $this.config.titleHTML = 'titleHTML' in $this.config ? $this.config.titleHTML : "Code Scanner";
      $this.config.titleLink = 'titleLink' in $this.config ? $this.config.titleLink : "https://github.com/mebjas/html5-qrcode";
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;
      var header = document.createElement("div");

      if ($this.config.inlineCSS) {
        header.style.textAlign = "left";
        header.style.margin = "0px";
        header.style.padding = "5px";
        header.style.fontSize = "20px";
        header.style.borderBottom = "1px solid rgba(192, 192, 192, 0.18)";
      } else {
        header.classList.add("qr-reader__title");
      }

      dashboard.appendChild(header);

      if ($this.config.titleHTML) {
        var titleSpan = document.createElement("span");

        if ($this.config.titleLink) {
          var titleLink = document.createElement("a");
          titleLink.innerHTML = $this.config.titleHTML;
          titleLink.href = $this.config.titleLink;
          titleSpan.appendChild(titleLink);
        } else {
          titleSpan.innerHTML = $this.config.titleHTML;
        }

        header.appendChild(titleSpan);
      }

      var statusSpan = document.createElement("span");
      statusSpan.id = this.__getStatusSpanId();

      if ($this.config.inlineCSS) {
        statusSpan.style["float"] = "right";
        statusSpan.style.padding = "5px 7px";
        statusSpan.style.fontSize = "14px";
        statusSpan.style.background = "#dedede6b";
        statusSpan.style.border = "1px solid #00000000";
        statusSpan.style.color = "rgb(17, 17, 17)";
      } else {
        statusSpan.classList.add("qr-reader__status");
      }

      header.appendChild(statusSpan);

      this.__setStatus($this.lang == "de" ? "Leerlauf" : "IDLE");

      var headerMessageContainer = document.createElement("div");
      headerMessageContainer.id = this.__getHeaderMessageContainerId();

      if ($this.config.inlineCSS) {
        headerMessageContainer.style.display = "none";
        headerMessageContainer.style.fontSize = "14px";
        headerMessageContainer.style.padding = "2px 10px";
        headerMessageContainer.style.marginTop = "4px";
        headerMessageContainer.style.borderTop = "1px solid #f6f6f6";
      } else {
        headerMessageContainer.classList.add("qr-reader__header_message");
      }

      header.appendChild(headerMessageContainer);
    }
  }, {
    key: "__createSection",
    value: function __createSection(dashboard) {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;
      var section = document.createElement("div");
      section.id = this.__getDashboardSectionId();

      if ($this.config.inlineCSS) {
        section.style.width = "100%";
        section.style.padding = "10px";
        section.style.textAlign = "left";
      } else {
        section.classList.add("qr-reader__section");
      }

      dashboard.appendChild(section);
    }
  }, {
    key: "__createSectionControlPanel",
    value: function __createSectionControlPanel() {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;
      var section = document.getElementById(this.__getDashboardSectionId());
      var sectionControlPanel = document.createElement("div");
      section.appendChild(sectionControlPanel);
      var scpCameraScanRegion = document.createElement("div");
      scpCameraScanRegion.id = this.__getDashboardSectionCameraScanRegionId();
      scpCameraScanRegion.style.display = this.currentScanType == Html5QrcodeScanner.SCAN_TYPE_CAMERA ? "block" : "none";
      sectionControlPanel.appendChild(scpCameraScanRegion); // Assuming when the object is created permission is needed.

      var requestPermissionContainer = document.createElement("div");

      if ($this.config.inlineCSS) {
        requestPermissionContainer.style.textAlign = "center";
      } else {
        requestPermissionContainer.classList.add("qr-reader__text_center");
      }

      var requestPermissionButton = document.createElement("button");
      requestPermissionButton.innerHTML = $this.lang == "de" ? "Kameraberechtigungen anfordern" : "Request Camera Permissions";
      requestPermissionButton.addEventListener("click", function () {
        requestPermissionButton.disabled = true;

        $this.__setStatus($this.lang == "de" ? "Genehmigung" : "PERMISSION");

        $this.__setHeaderMessage($this.lang == "de" ? "Kameraberechtigungen anfordern ..." : "Requesting camera permissions...");

        Html5Qrcode.getCameras().then(function (cameras) {
          $this.__setStatus($this.lang == "de" ? "Leerlauf" : "IDLE");

          $this.__resetHeaderMessage();

          if (!cameras || cameras.length == 0) {
            $this.__setStatus($this.lang == "de" ? "Keine Kameras" : "No Cameras", Html5QrcodeScanner.STATUS_WARNING);
          } else {
            scpCameraScanRegion.removeChild(requestPermissionContainer);

            $this.__renderCameraSelection(cameras);
          }
        })["catch"](function (error) {
          requestPermissionButton.disabled = false;

          $this.__setStatus($this.lang == "de" ? "Leerlauf" : "IDLE");

          $this.__setHeaderMessage(error, Html5QrcodeScanner.STATUS_WARNING);
        });
      });
      requestPermissionContainer.appendChild(requestPermissionButton);
      scpCameraScanRegion.appendChild(requestPermissionContainer);
      var fileBasedScanRegion = document.createElement("div");
      fileBasedScanRegion.id = this.__getDashboardSectionFileScanRegionId();

      if ($this.config.inlineCSS) {
        fileBasedScanRegion.style.textAlign = "center";
      } else {
        requestPermissionContainer.classList.add("qr-reader__text_center");
      }

      fileBasedScanRegion.style.display = this.currentScanType == Html5QrcodeScanner.SCAN_TYPE_CAMERA ? "none" : "block";
      sectionControlPanel.appendChild(fileBasedScanRegion);
      var fileScanInput = document.createElement("input");
      fileScanInput.id = this.__getFileScanInputId();
      fileScanInput.accept = "image/*";
      fileScanInput.type = "file";

      if ($this.config.inlineCSS) {
        fileScanInput.style.width = "200px";
      } else {
        fileScanInput.classList.add("qr-reader__file_input");
      }

      fileScanInput.disabled = this.currentScanType == Html5QrcodeScanner.SCAN_TYPE_CAMERA;
      var fileScanLabel = document.createElement("span");
      fileScanLabel.innerHTML = $this.lang == "de" ? "&nbsp; Bild auswählen" : "&nbsp; Select Image";
      fileBasedScanRegion.appendChild(fileScanInput);
      fileBasedScanRegion.appendChild(fileScanLabel);
      fileScanInput.addEventListener('change', function (e) {
        if ($this.currentScanType !== Html5QrcodeScanner.SCAN_TYPE_FILE) {
          return;
        }

        if (e.target.files.length == 0) {
          return;
        }

        var file = e.target.files[0];
        $this.html5Qrcode.scanFile(file, true).then(function (qrCode) {
          $this.__resetHeaderMessage();

          $this.qrCodeSuccessCallback(qrCode);
        })["catch"](function (error) {
          $this.__setStatus($this.lang == "de" ? "Fehler" : "ERROR", Html5QrcodeScanner.STATUS_WARNING);

          $this.__setHeaderMessage(error, Html5QrcodeScanner.STATUS_WARNING);

          $this.qrCodeErrorCallback(error);
        });
      });
    }
  }, {
    key: "__renderCameraSelection",
    value: function __renderCameraSelection(cameras) {
      var $this = this;
      var config = $this.config ? $this.config : {
        fps: 10,
        qrbox: 250
      };
      config.inlineCSS = 'inlineCSS' in config ? config.inlineCSS : true;
      var scpCameraScanRegion = document.getElementById(this.__getDashboardSectionCameraScanRegionId());

      if (config.inlineCSS) {
        scpCameraScanRegion.style.textAlign = "center";
      } else {
        scpCameraScanRegion.classList.add("qr-reader__text_center");
      }

      var cameraSelectionContainer = document.createElement("span");
      cameraSelectionContainer.innerHTML = $this.lang == "de" ? "Kamera w\xE4hlen (".concat(cameras.length, ") &nbsp;") : "Select Camera (".concat(cameras.length, ") &nbsp;");

      if (config.inlineCSS) {
        cameraSelectionContainer.style.marginRight = "10px";
      } else {
        cameraSelectionContainer.classList.add("qr-reader__camera_selection");
      }

      var cameraSelectionSelect = document.createElement("select");
      cameraSelectionSelect.id = this.__getCameraSelectionId();

      for (var i = 0; i < cameras.length; i++) {
        var camera = cameras[i];
        var value = camera.id;
        var name = camera.label == null ? value : camera.label;
        var option = document.createElement('option');
        option.value = value;
        option.innerHTML = name;
        cameraSelectionSelect.appendChild(option);
      }

      cameraSelectionContainer.appendChild(cameraSelectionSelect);
      scpCameraScanRegion.appendChild(cameraSelectionContainer);
      var cameraActionContainer = document.createElement("span");
      var cameraActionStartButton = document.createElement("button");
      cameraActionStartButton.innerHTML = $this.lang == "de" ? "Scan starten" : "Start Scanning";
      cameraActionContainer.appendChild(cameraActionStartButton);
      var cameraActionStopButton = document.createElement("button");
      cameraActionStopButton.innerHTML = $this.lang == "de" ? "Scannen beenden" : "Stop Scanning";
      cameraActionStopButton.style.display = "none";
      cameraActionStopButton.disabled = true;
      cameraActionContainer.appendChild(cameraActionStopButton);
      scpCameraScanRegion.appendChild(cameraActionContainer);
      cameraActionStartButton.addEventListener('click', function (_) {
        cameraSelectionSelect.disabled = true;
        cameraActionStartButton.disabled = true;

        $this._showHideScanTypeSwapLink(false);

        var cameraId = cameraSelectionSelect.value;
        $this.html5Qrcode.start(cameraId, config, $this.qrCodeSuccessCallback, $this.qrCodeErrorCallback).then(function (_) {
          cameraActionStopButton.disabled = false;
          cameraActionStopButton.style.display = "inline-block";
          cameraActionStartButton.style.display = "none";

          $this.__setStatus($this.lang == "de" ? "Scannen" : "Scanning");
        })["catch"](function (error) {
          $this._showHideScanTypeSwapLink(true);

          cameraSelectionSelect.disabled = false;
          cameraActionStartButton.disabled = false;

          $this.__setStatus($this.lang == "de" ? "Leerlauf" : "IDLE");

          $this.__setHeaderMessage(error, Html5QrcodeScanner.STATUS_WARNING);
        });
      });
      cameraActionStopButton.addEventListener('click', function (_) {
        cameraActionStopButton.disabled = true;
        $this.html5Qrcode.stop().then(function (_) {
          $this._showHideScanTypeSwapLink(true);

          cameraSelectionSelect.disabled = false;
          cameraActionStartButton.disabled = false;
          cameraActionStopButton.style.display = "none";
          cameraActionStartButton.style.display = "inline-block";

          $this.__setStatus($this.lang == "de" ? "Leerlauf" : "IDLE");

          $this.__insertCameraScanImageToScanRegion();
        })["catch"](function (error) {
          cameraActionStopButton.disabled = false;

          $this.__setStatus($this.lang == "de" ? "Fehler" : "ERROR", Html5QrcodeScanner.STATUS_WARNING);

          $this.__setHeaderMessage(error, Html5QrcodeScanner.STATUS_WARNING);
        });
      });
    }
  }, {
    key: "__createSectionSwap",
    value: function __createSectionSwap() {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;
      var TEXT_IF_CAMERA_SCAN_SELECTED = $this.lang == "de" ? "Bilddatei scannen" : "Scan an Image File";
      var TEXT_IF_FILE_SCAN_SELECTED = $this.lang == "de" ? "Mit Kamera direkt scannen" : "Scan using camera directly";
      var section = document.getElementById(this.__getDashboardSectionId());
      var switchContainer = document.createElement("div");

      if ($this.config.inlineCSS) {
        switchContainer.style.textAlign = "center";
      } else {
        switchContainer.classList.add("qr-reader__text_center");
      }

      var swithToFileBasedLink = document.createElement("a");

      if ($this.config.inlineCSS) {
        swithToFileBasedLink.style.textDecoration = "underline";
      } else {
        swithToFileBasedLink.classList.add("qr-reader__file_link");
      }

      swithToFileBasedLink.id = this.__getDashboardSectionSwapLinkId();
      swithToFileBasedLink.innerHTML = this.currentScanType == Html5QrcodeScanner.SCAN_TYPE_CAMERA ? TEXT_IF_CAMERA_SCAN_SELECTED : TEXT_IF_FILE_SCAN_SELECTED;
      swithToFileBasedLink.href = "#scan-using-file";
      swithToFileBasedLink.addEventListener('click', function () {
        if (!$this.sectionSwapAllowed) {
          if ($this.verbose) {
            console.error($this.lang == "de" ? "Abschnittswechsel aufgerufen, obwohl nicht erlaubt" : "Section swap called when not allowed");
          }

          return;
        } // Cleanup states


        $this.__setStatus($this.lang == "de" ? "Leerlauf" : "IDLE");

        $this.__resetHeaderMessage();

        $this.__getFileScanInput().value = "";
        $this.sectionSwapAllowed = false;

        if ($this.currentScanType == Html5QrcodeScanner.SCAN_TYPE_CAMERA) {
          // swap to file
          $this.__clearScanRegion();

          $this.__getFileScanInput().disabled = false;
          $this.__getCameraScanRegion().style.display = "none";
          $this.__getFileScanRegion().style.display = "block";
          swithToFileBasedLink.innerHTML = TEXT_IF_FILE_SCAN_SELECTED;
          $this.currentScanType = Html5QrcodeScanner.SCAN_TYPE_FILE;

          $this.__insertFileScanImageToScanRegion();
        } else {
          // swap to camera based scanning
          $this.__clearScanRegion();

          $this.__getFileScanInput().disabled = true;
          $this.__getCameraScanRegion().style.display = "block";
          $this.__getFileScanRegion().style.display = "none";
          swithToFileBasedLink.innerHTML = TEXT_IF_CAMERA_SCAN_SELECTED;
          $this.currentScanType = Html5QrcodeScanner.SCAN_TYPE_CAMERA;

          $this.__insertCameraScanImageToScanRegion();
        }

        $this.sectionSwapAllowed = true;
      });
      switchContainer.appendChild(swithToFileBasedLink);
      section.appendChild(switchContainer);
    }
  }, {
    key: "__setStatus",
    value: function __setStatus(statusText, statusClass) {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;

      if (!statusClass) {
        statusClass = Html5QrcodeScanner.STATUS_DEFAULT;
      }

      var statusSpan = document.getElementById(this.__getStatusSpanId());
      statusSpan.innerHTML = statusText;

      if (!$this.config.inlineCSS) {
        var oldClass = new RegExp(/\bqr-reader__status_.+?\b/, 'g'); // remove/reset class

        statusSpan.className = statusSpan.className.replace(oldClass, ''); // add new class

        statusSpan.classList.add("qr-reader__" + statusClass.toLowerCase());
      } else {
        switch (statusClass) {
          case Html5QrcodeScanner.STATUS_SUCCESS:
            statusSpan.style.background = "#6aaf5042";
            statusSpan.style.color = "#477735";
            break;

          case Html5QrcodeScanner.STATUS_WARNING:
            statusSpan.style.background = "#cb243124";
            statusSpan.style.color = "#cb2431";
            break;

          case Html5QrcodeScanner.STATUS_DEFAULT:
          default:
            statusSpan.style.background = "#eef";
            statusSpan.style.color = "rgb(17, 17, 17)";
            break;
        }
      }
    }
  }, {
    key: "__resetHeaderMessage",
    value: function __resetHeaderMessage() {
      var messageDiv = document.getElementById(this.__getHeaderMessageContainerId());
      messageDiv.style.display = "none";
    }
  }, {
    key: "__setHeaderMessage",
    value: function __setHeaderMessage(messageText, statusClass) {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;

      if (!statusClass) {
        statusClass = Html5QrcodeScanner.STATUS_DEFAULT;
      }

      var messageDiv = document.getElementById(this.__getHeaderMessageContainerId());
      messageDiv.innerHTML = messageText;
      messageDiv.style.display = "block";

      if (!$this.config.inlineCSS) {
        var oldClass = new RegExp(/\bqr-reader__status_.+?\b/, 'g'); // remove/reset class

        messageDiv.className = messageDiv.className.replace(oldClass, ''); // add new class

        messageDiv.classList.add("qr-reader__" + statusClass.toLowerCase());
      } else {
        switch (statusClass) {
          case Html5QrcodeScanner.STATUS_SUCCESS:
            messageDiv.style.background = "#6aaf5042";
            messageDiv.style.color = "#477735";
            break;

          case Html5QrcodeScanner.STATUS_WARNING:
            messageDiv.style.background = "#cb243124";
            messageDiv.style.color = "#cb2431";
            break;

          case Html5QrcodeScanner.STATUS_DEFAULT:
          default:
            messageDiv.style.background = "#00000000";
            messageDiv.style.color = "rgb(17, 17, 17)";
            break;
        }
      }
    }
  }, {
    key: "_showHideScanTypeSwapLink",
    value: function _showHideScanTypeSwapLink(shouldDisplay) {
      $allowFileScan = 'allowFileScan' in this.config ? this.config.allowFileScan : true;

      if (shouldDisplay !== true) {
        shouldDisplay = false;
      }

      this.sectionSwapAllowed = $allowFileScan ? shouldDisplay : $allowFileScan;

      if ($allowFileScan) {
        this.__getDashboardSectionSwapLink().style.display = shouldDisplay ? "inline-block" : "none";
      }
    }
  }, {
    key: "__insertCameraScanImageToScanRegion",
    value: function __insertCameraScanImageToScanRegion() {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;
      var qrCodeScanRegion = document.getElementById(this.__getScanRegionId());

      if (this.cameraScanImage) {
        qrCodeScanRegion.innerHTML = "<br>";
        qrCodeScanRegion.appendChild(this.cameraScanImage);
        return;
      }

      this.cameraScanImage = new Image();

      this.cameraScanImage.onload = function (_) {
        qrCodeScanRegion.innerHTML = "<br>";
        qrCodeScanRegion.appendChild($this.cameraScanImage);
      };

      if ($this.config.inlineCSS) {
        this.cameraScanImage.width = 64;
        this.cameraScanImage.style.opacity = 0.3;
      } else {
        this.cameraScanImage.classList.add("qr-reader__camera_scan_image");
      }

      this.cameraScanImage.src = Html5QrcodeScanner.ASSET_CAMERA_SCAN;
    }
  }, {
    key: "__insertFileScanImageToScanRegion",
    value: function __insertFileScanImageToScanRegion() {
      var $this = this;
      $this.config.inlineCSS = 'inlineCSS' in $this.config ? $this.config.inlineCSS : true;
      var qrCodeScanRegion = document.getElementById(this.__getScanRegionId());

      if (this.fileScanImage) {
        qrCodeScanRegion.innerHTML = "<br>";
        qrCodeScanRegion.appendChild(this.fileScanImage);
        return;
      }

      this.fileScanImage = new Image();

      this.fileScanImage.onload = function (_) {
        qrCodeScanRegion.innerHTML = "<br>";
        qrCodeScanRegion.appendChild($this.fileScanImage);
      };

      if ($this.config.inlineCSS) {
        this.fileScanImage.width = 64;
        this.fileScanImage.style.opacity = 0.3;
      } else {
        this.cameraScanImage.classList.add("qr-reader__file_scan_image");
      }

      this.fileScanImage.src = Html5QrcodeScanner.ASSET_FILE_SCAN;
    }
  }, {
    key: "__clearScanRegion",
    value: function __clearScanRegion() {
      var qrCodeScanRegion = document.getElementById(this.__getScanRegionId());
      qrCodeScanRegion.innerHTML = "";
    } //#endregion
    //#region state getters

  }, {
    key: "__getDashboardSectionId",
    value: function __getDashboardSectionId() {
      return "".concat(this.elementId, "__dashboard_section");
    }
  }, {
    key: "__getDashboardSectionCameraScanRegionId",
    value: function __getDashboardSectionCameraScanRegionId() {
      return "".concat(this.elementId, "__dashboard_section_csr");
    }
  }, {
    key: "__getDashboardSectionFileScanRegionId",
    value: function __getDashboardSectionFileScanRegionId() {
      return "".concat(this.elementId, "__dashboard_section_fsr");
    }
  }, {
    key: "__getDashboardSectionSwapLinkId",
    value: function __getDashboardSectionSwapLinkId() {
      return "".concat(this.elementId, "__dashboard_section_swaplink");
    }
  }, {
    key: "__getScanRegionId",
    value: function __getScanRegionId() {
      return "".concat(this.elementId, "__scan_region");
    }
  }, {
    key: "__getDashboardId",
    value: function __getDashboardId() {
      return "".concat(this.elementId, "__dashboard");
    }
  }, {
    key: "__getFileScanInputId",
    value: function __getFileScanInputId() {
      return "".concat(this.elementId, "__filescan_input");
    }
  }, {
    key: "__getStatusSpanId",
    value: function __getStatusSpanId() {
      return "".concat(this.elementId, "__status_span");
    }
  }, {
    key: "__getHeaderMessageContainerId",
    value: function __getHeaderMessageContainerId() {
      return "".concat(this.elementId, "__header_message");
    }
  }, {
    key: "__getCameraSelectionId",
    value: function __getCameraSelectionId() {
      return "".concat(this.elementId, "__camera_selection");
    }
  }, {
    key: "__getCameraScanRegion",
    value: function __getCameraScanRegion() {
      return document.getElementById(this.__getDashboardSectionCameraScanRegionId());
    }
  }, {
    key: "__getFileScanRegion",
    value: function __getFileScanRegion() {
      return document.getElementById(this.__getDashboardSectionFileScanRegionId());
    }
  }, {
    key: "__getFileScanInput",
    value: function __getFileScanInput() {
      return document.getElementById(this.__getFileScanInputId());
    }
  }, {
    key: "__getDashboardSectionSwapLink",
    value: function __getDashboardSectionSwapLink() {
      return document.getElementById(this.__getDashboardSectionSwapLinkId());
    } //#endregion

  }]);

  return Html5QrcodeScanner;
}();

_defineProperty(Html5QrcodeScanner, "SCAN_TYPE_CAMERA", "SCAN_TYPE_CAMERA");

_defineProperty(Html5QrcodeScanner, "SCAN_TYPE_FILE", "SCAN_TYPE_FILE");

_defineProperty(Html5QrcodeScanner, "STATUS_SUCCESS", "STATUS_SUCCESS");

_defineProperty(Html5QrcodeScanner, "STATUS_WARNING", "STATUS_WARNING");

_defineProperty(Html5QrcodeScanner, "STATUS_DEFAULT", "STATUS_DEFAULT");

_defineProperty(Html5QrcodeScanner, "ASSET_FILE_SCAN", "https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/file-scan.gif");

_defineProperty(Html5QrcodeScanner, "ASSET_CAMERA_SCAN", "https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/camera-scan.gif");