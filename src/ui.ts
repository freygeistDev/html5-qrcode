/**
 * @fileoverview
 * All structured UI classes.
 * 
 * TODO(mebjas): Migrate all UI components to modular UI classes so they are
 * easy to improve.
 * TODO(mebjas): Add tests for all UI components.
 * @author mebjas <minhazav@gmail.com>
 */

import { ASSET_CLOSE_ICON_16PX, ASSET_INFO_ICON_16PX } from "./image-assets";

import { LibraryInfoStrings } from "./strings";
import {
    CssClassNames,
    applyStyle,
    showElement,
    hideElement
} from "./css-config";

type OnClickListener0 = () => void;

//#region Info Icon + Div

class LibraryInfoDiv {
    private infoDiv: HTMLDivElement;

    constructor() {
        this.infoDiv = document.createElement("div");
    }

    public renderInto(parent: HTMLElement) {
        applyStyle(this.infoDiv, CssClassNames.LIBRARY_INFO, {
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: "2",
            display: "none",
            padding: "5pt",
            border: "1px solid #171717",
            fontSize: "10pt",
            background: "rgb(0 0 0 / 69%)",
            borderRadius: "5px",
            textAlign: "center",
            fontWeight: "400",
            color: "white"
        });

        this.infoDiv.innerText = LibraryInfoStrings.poweredBy();
        const projectLink = document.createElement("a");
        projectLink.innerText = "ScanApp";
        projectLink.href = "https://scanapp.org";
        projectLink.target = "new";
        applyStyle(projectLink, CssClassNames.LIBRARY_INFO_LINK, {
            color: "white"
        });
        this.infoDiv.appendChild(projectLink);

        const breakElemFirst = document.createElement("br");
        const breakElemSecond = document.createElement("br");
        this.infoDiv.appendChild(breakElemFirst);
        this.infoDiv.appendChild(breakElemSecond);

        const reportIssueLink = document.createElement("a");
        reportIssueLink.innerText = LibraryInfoStrings.reportIssues();
        reportIssueLink.href = "https://github.com/mebjas/html5-qrcode/issues";
        reportIssueLink.target = "new";
        applyStyle(reportIssueLink, CssClassNames.LIBRARY_INFO_LINK, {
            color: "white"
        });
        this.infoDiv.appendChild(reportIssueLink);

        parent.appendChild(this.infoDiv);
    }

    public show() {
        showElement(this.infoDiv, "block");
    }

    public hide() {
        hideElement(this.infoDiv);
    }
}

class LibraryInfoIcon {

    private infoIcon: HTMLImageElement;
    private onTapIn: OnClickListener0;
    private onTapOut: OnClickListener0;
    private isShowingInfoIcon: boolean = true;

    constructor(onTapIn: OnClickListener0, onTapOut: OnClickListener0) {
        this.onTapIn = onTapIn;
        this.onTapOut = onTapOut;

        this.infoIcon = document.createElement("img");
    }
    
    public renderInto(parent: HTMLElement) {
        this.infoIcon.alt = "Info icon";
        this.infoIcon.src = ASSET_INFO_ICON_16PX;
        this.infoIcon.style.position = "absolute";
        this.infoIcon.style.top = "4px";
        this.infoIcon.style.right = "4px";
        this.infoIcon.style.opacity = "0.6";
        this.infoIcon.style.cursor = "pointer";
        this.infoIcon.style.zIndex = "2";
        this.infoIcon.style.width = "16px";
        this.infoIcon.style.height = "16px";

        this.infoIcon.onmouseover = (_) => this.onHoverIn();
        this.infoIcon.onmouseout = (_) => this.onHoverOut();
        this.infoIcon.onclick = (_) => this.onClick();

        parent.appendChild(this.infoIcon);
    }

    private onHoverIn() {
        if (this.isShowingInfoIcon) {
            this.infoIcon.style.opacity = "1";
        }
    }

    private onHoverOut() {
        if (this.isShowingInfoIcon) {
            this.infoIcon.style.opacity = "0.6";
        }
    }

    private onClick() {
        if (this.isShowingInfoIcon) {
            this.isShowingInfoIcon = false;
            this.onTapIn();
            this.infoIcon.src = ASSET_CLOSE_ICON_16PX;
            this.infoIcon.style.opacity = "1";
        } else {
            this.isShowingInfoIcon = true;
            this.onTapOut();
            this.infoIcon.src = ASSET_INFO_ICON_16PX;
            this.infoIcon.style.opacity = "0.6";
        }
    }
}

export class LibraryInfoContainer {

    private infoDiv: LibraryInfoDiv;
    private infoIcon: LibraryInfoIcon;

    constructor() {
        this.infoDiv = new LibraryInfoDiv();
        this.infoIcon = new LibraryInfoIcon(() => {
            this.infoDiv.show();
        }, () => {
            this.infoDiv.hide();
        });
    }
    
    public renderInto(parent: HTMLElement) {
        this.infoDiv.renderInto(parent);
        this.infoIcon.renderInto(parent);
    }
}
//#endregion
