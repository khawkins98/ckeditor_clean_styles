/* eslint-disable max-classes-per-file */
/**
 * @file
 * CKEditor 5 Clean Text Styles plugin - Build-free version.
 *
 * This plugin removes unwanted text formatting artifacts from pasted content.
 * Removes inline styles, document-specific classes, attributes, and &nbsp; entities.
 */

(function (global, factory) {
  if (typeof exports === "object" && typeof module === "object") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    global.CKEditor5 = global.CKEditor5 || {};
    global.CKEditor5.cleanTextStyles = factory();
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
    ? window
    : this,
  function () {
    /**
     * Configuration for text formatting artifact cleanup.
     */
    const CONFIG = {
      WORD_CLASSES: [
        "OutlineElement",
        "Ltr",
        "SCXW",
        "BCX",
        "ListContainerWrapper",
        "NormalTextRun",
        "normaltextrun",
        "WordSection1",
        "spellingerror",
        "EOP",
        "Paragraph",
        "MsoNormal",
        "MsoListParagraph",
        "MsoBodyText",
      ],
      // Attributes to always remove when encountered
      ATTRS_REMOVE_ALWAYS: ["lang", "language", "align", "paraid", "paraeid"],
      // HR presentational attributes to strip
      HR_ATTRS_TO_REMOVE: ["align", "size", "width", "color", "noshade"],
      // Namespace/prefix handling
      VML_PREFIX: "v:",
      VML_SHAPES_ATTR: "v:shapes",
      // Regex patterns (as strings) for special removals
      MSO_ANCHOR_PATTERN: "(^|_)msoanchor",
      WORD_ID_PATTERN: "^(OLE_LINK|_Toc|_Ref)\\d*$",
    };

    // Detection for Word-specific class substrings.
    const WORD_CLASS_SUBSTRINGS = CONFIG.WORD_CLASSES.map(function (s) {
      return String(s).toLowerCase();
    });

    // Attribute cleanup helpers
    const UNCONDITIONAL_REMOVE_ATTRS = new Set(CONFIG.ATTRS_REMOVE_ALWAYS);
    const MSOANCHOR_REGEX = new RegExp(CONFIG.MSO_ANCHOR_PATTERN, "i");
    const WORD_ID_PREFIX_REGEX = new RegExp(CONFIG.WORD_ID_PATTERN);

    /**
     * Clean Text Styles plugin for CKEditor 5.
     */
    class CleanTextStyles extends globalThis.CKEditor5.core.Plugin {
      /**
       * @inheritdoc
       */
      static get pluginName() {
        return "CleanTextStyles";
      }

      /**
       * @inheritdoc
       */
      init() {
        const { editor } = this;
        const { t } = editor;

        // Add the clean text styles command
        editor.commands.add(
          "cleanTextStyles",
          new CleanTextStylesCommand(editor)
        );

        // Add the button to the toolbar
        editor.ui.componentFactory.add("cleanTextStyles", function (locale) {
          const command = editor.commands.get("cleanTextStyles");
          const buttonView = new globalThis.CKEditor5.ui.ButtonView(locale);

          buttonView.set({
            label: t("Clean Text Styles"),
            tooltip: true,
          });

          // Execute command when the button is clicked
          buttonView.on("execute", function () {
            editor.execute("cleanTextStyles");
            editor.editing.view.focus();
          });

          // Bind button state to command
          buttonView.bind("isEnabled").to(command);

          return buttonView;
        });
      }
    }

    /**
     * Clean Text Styles command.
     */
    class CleanTextStylesCommand extends globalThis.CKEditor5.core.Command {
      constructor(editor) {
        super(editor);
      }

      /**
       * Executes the command - cleans text formatting artifacts from editor content.
       */
      execute() {
        const editor = this.editor;
        const selection = editor.model.document.selection;

        // If there is a non-collapsed selection, clean only the selected content.
        if (!selection.isCollapsed) {
          try {
            const modelFragment = editor.model.getSelectedContent(selection);

            // Prefer using DataController.stringify when available to serialize the model fragment.
            let selectedHtml = null;
            if (editor.data && typeof editor.data.stringify === "function") {
              selectedHtml = editor.data.stringify(modelFragment);
            }

            if (typeof selectedHtml === "string") {
              const cleanedSelected = this._cleanTextStyles(selectedHtml);

              if (cleanedSelected !== selectedHtml) {
                const viewFragment =
                  editor.data.processor.toView(cleanedSelected);
                const modelClean = editor.data.toModel(viewFragment);

                editor.model.change(() => {
                  // Replace the current selection with cleaned content.
                  editor.model.deleteContent(selection);
                  editor.model.insertContent(modelClean);
                });
              }

              return; // Done handling selection case.
            }
            // If we cannot serialize selection, fall through to full document cleanup.
          } catch (e) {
            // On any error, fall back to full document cleanup below.
          }
        }

        // Fallback: clean the entire editor content.
        const currentData = editor.getData();
        const cleanedData = this._cleanTextStyles(currentData);
        if (cleanedData !== currentData) {
          editor.setData(cleanedData);
        }
      }

      /**
       * Cleans text formatting artifacts from raw HTML string.
       *
       * @param {string} html - The HTML string to clean
       * @return {string} - The cleaned HTML string
       */
      _cleanTextStyles(html) {
        if (!html || typeof html !== "string") {
          return html;
        }

        try {
          // Normalize non-breaking spaces before parsing to simplify downstream cleanup
          const normalizedHtml = html.replace(
            /(?:&nbsp;|&#160;|&#xA0;|&#xa0;|\u00A0)/g,
            " "
          );

          // Create a temporary container to parse HTML
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = normalizedHtml;

          // Clean all elements
          const allElements = tempDiv.querySelectorAll("*");
          for (let i = 0; i < allElements.length; i++) {
            this._cleanHtmlElement(allElements[i]);
          }

          // Remove paragraphs that are effectively empty:
          //  - only whitespace text
          //  - and either no element children or only <br> children
          const paragraphs = tempDiv.querySelectorAll("p");
          for (let pi = 0; pi < paragraphs.length; pi++) {
            const p = paragraphs[pi];
            if (!p) continue;

            const onlyWhitespace = (p.textContent || "").trim().length === 0;
            if (!onlyWhitespace) continue;

            const children = p.children || [];
            const hasNoElementChildren = children.length === 0;
            const onlyBrChildren = hasNoElementChildren
              ? true
              : Array.prototype.every.call(children, function (child) {
                  return (
                    child &&
                    child.tagName &&
                    child.tagName.toLowerCase() === "br"
                  );
                });

            if ((hasNoElementChildren || onlyBrChildren) && p.parentNode) {
              p.parentNode.removeChild(p);
            }
          }

          // Return cleaned HTML
          return tempDiv.innerHTML;
        } catch (error) {
          return html; // Return original on error
        }
      }

      /**
       * Cleans a single HTML DOM element.
       *
       * @param {Element} element - The DOM element to clean
       */
      _cleanHtmlElement(element) {
        // Remove ALL inline styles (aggressive cleaning)
        if (element.hasAttribute("style")) {
          element.removeAttribute("style");
        }

        // Clean class attribute
        if (element.hasAttribute("class")) {
          const originalClasses = element.getAttribute("class");
          const cleanedClasses = this._cleanClasses(originalClasses);

          if (cleanedClasses !== originalClasses) {
            if (cleanedClasses.trim() === "") {
              element.removeAttribute("class");
            } else {
              element.setAttribute("class", cleanedClasses);
            }
          }
        }

        // Remove inline event handlers and other undesirable attributes
        // Iterate a copy because we'll mutate attributes while iterating
        const attrs = Array.prototype.slice.call(element.attributes || []);
        for (let k = 0; k < attrs.length; k++) {
          const attrNode = attrs[k];
          const attrName = String(attrNode.name || "");
          const attrValue = String(attrNode.value || "");
          const nameLower = attrName.toLowerCase();

          const isInlineEventHandler = nameLower.startsWith("on");
          const isUnconditionalRemoval =
            UNCONDITIONAL_REMOVE_ATTRS.has(nameLower);
          const isVmlNamespace =
            nameLower === CONFIG.VML_SHAPES_ATTR ||
            nameLower.startsWith(CONFIG.VML_PREFIX);
          const isMsoAnchorName =
            nameLower === "name" && MSOANCHOR_REGEX.test(attrValue);
          const isWordSpecificId =
            nameLower === "id" &&
            (WORD_ID_PREFIX_REGEX.test(attrValue) ||
              attrValue.includes("Word") ||
              attrValue.includes("Office"));

          if (
            isInlineEventHandler ||
            isUnconditionalRemoval ||
            isVmlNamespace ||
            isMsoAnchorName ||
            isWordSpecificId
          ) {
            element.removeAttribute(attrName);
            continue;
          }
        }

        // Preserve <hr> but drop presentational attributes
        if (element.tagName && element.tagName.toLowerCase() === "hr") {
          const hrAttrs = CONFIG.HR_ATTRS_TO_REMOVE;
          for (let h = 0; h < hrAttrs.length; h++) {
            if (element.hasAttribute(hrAttrs[h])) {
              element.removeAttribute(hrAttrs[h]);
            }
          }
        }
      }

      /**
       * Cleans class attribute values by removing Word-specific classes.
       *
       * @param {string} classString - The class attribute value
       * @return {string} - The cleaned class string
       */
      _cleanClasses(classString) {
        if (!classString || typeof classString !== "string") {
          return "";
        }

        const classes = classString.split(/\s+/);
        const cleaned = [];
        for (let i = 0; i < classes.length; i++) {
          const cls = classes[i];
          if (!cls || !cls.trim()) {
            continue;
          }
          const token = cls.trim();
          const tokenLower = token.toLowerCase();
          const containsWordSubstring = WORD_CLASS_SUBSTRINGS.some(function (
            needle
          ) {
            return tokenLower.indexOf(needle) !== -1;
          });
          if (!containsWordSubstring) {
            cleaned.push(token);
          }
        }
        return cleaned.join(" ");
      }
    }

    // Export the plugin
    return {
      CleanTextStyles,
    };
  }
);
