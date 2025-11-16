/* eslint-disable max-classes-per-file */
/**
 * @file
 * CKEditor 5 Clean Text Styles plugin - Build-free version.
 *
 * Adds a toolbar button to remove Microsoft Word HTML artifacts from content.
 *
 * Usage:
 * - Select text and click button: Cleans only the selection
 * - No selection and click button: Cleans entire document
 *
 * Removes:
 * - ALL inline style attributes (style="...")
 * - Word-specific classes (MsoNormal, SCXW, OutlineElement, etc.)
 * - Word-specific attributes (paraid, paraeid, lang, etc.)
 * - Word-specific IDs (OLE_LINK, _Toc, _Ref)
 * - &nbsp; entities (replaced with spaces)
 * - Empty paragraphs (including those with only whitespace)
 *
 * Technical:
 * - Build-free UMD module (no npm compilation needed)
 * - Works on CKEditor 5 model/view architecture
 * - Operations are undoable (Ctrl+Z)
 */

(function (global, factory) {
  if (typeof exports === "object" && typeof module === "object") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    global.CKEditor5 = global.CKEditor5 || {};
    global.CKEditor5.cleanStyle = factory();
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
    ? window
    : this,
  function () {
    /**
     * Configuration for Word artifact cleanup.
     */
    const CONFIG = {
      WORD_CLASSES: [
        "OutlineElement",
        "Ltr",
        "SCXW",
        "BCX",
        "ListContainerWrapper",
        "NormalTextRun",
        "EOP",
        "Paragraph",
        "MsoNormal",
        "MsoListParagraph",
        "MsoBodyText",
      ],
      WORD_ATTRIBUTES: ["id", "paraid", "paraeid", "lang", "style", "class"],
      DEBUG: false, // Set to true to enable console logging
    };

    /**
     * Clean Text Styles plugin for CKEditor 5.
     */
    class CleanStyle extends globalThis.CKEditor5.core.Plugin {
      /**
       * @inheritdoc
       */
      static get pluginName() {
        return "CleanStyle";
      }

      /**
       * @inheritdoc
       */
      init() {
        const { editor } = this;
        const { t } = editor;

        if (CONFIG.DEBUG) {
          console.log("CleanTextStyles plugin initializing...");
        }

        // Add the clean style command
        editor.commands.add("cleanStyle", new CleanStyleCommand(editor));

        // Add the button to the toolbar
        editor.ui.componentFactory.add("cleanStyle", function (locale) {
          const command = editor.commands.get("cleanStyle");
          const buttonView = new globalThis.CKEditor5.ui.ButtonView(locale);

          buttonView.set({
            label: t("Clean Text Styles"),
            tooltip: true,
            class: "ck-clean-style-button",
          });

          // Execute command when the button is clicked
          buttonView.on("execute", function () {
            if (CONFIG.DEBUG) {
              console.log("Clean Text Styles button clicked!");
            }
            editor.execute("cleanStyle");
            editor.editing.view.focus();
          });

          // Bind button state to command
          buttonView.bind("isEnabled").to(command);

          return buttonView;
        });

        if (CONFIG.DEBUG) {
          console.log("CleanTextStyles plugin initialized successfully");
        }
      }
    }

    /**
     * Clean Text Styles command.
     */
    class CleanStyleCommand extends globalThis.CKEditor5.core.Command {
      constructor(editor) {
        super(editor);
        this.isEnabled = true;
      }

      /**
       * Executes the command - cleans Word HTML artifacts from editor content.
       */
      execute() {
        if (CONFIG.DEBUG) {
          console.log("CleanTextStyles command executing...");
        }

        const model = this.editor.model;
        const selection = model.document.selection;

        // Check if there's a selection
        if (!selection.isCollapsed) {
          if (CONFIG.DEBUG) {
            console.log("Cleaning selected content only");
          }
          this._cleanSelection();
        } else {
          if (CONFIG.DEBUG) {
            console.log("No selection - cleaning entire document");
          }
          this._cleanEntireDocument();
        }
      }

      /**
       * Cleans the currently selected content.
       */
      _cleanSelection() {
        const model = this.editor.model;
        const selection = model.document.selection;

        model.change((writer) => {
          // Get the selected content as HTML
          const viewFragment = this.editor.data.toView(
            model.getSelectedContent(selection)
          );
          const viewDocumentFragment = this.editor.data.processor.toData(
            viewFragment
          );

          if (CONFIG.DEBUG) {
            console.log("Selected content length:", viewDocumentFragment.length);
          }

          // Clean the selected HTML
          const cleanedData = this._cleanWordHtml(viewDocumentFragment);

          if (cleanedData !== viewDocumentFragment) {
            if (CONFIG.DEBUG) {
              console.log("Word HTML artifacts removed from selection");
            }

            // Parse the cleaned HTML back into model fragment
            const viewFragmentCleaned = this.editor.data.processor.toView(
              cleanedData
            );
            const modelFragment = this.editor.data.toModel(
              viewFragmentCleaned
            );

            // Replace the selection with cleaned content
            model.insertContent(modelFragment, selection);
          } else {
            if (CONFIG.DEBUG) {
              console.log("No Word HTML artifacts found in selection");
            }
          }
        });
      }

      /**
       * Cleans the entire document content.
       */
      _cleanEntireDocument() {
        // Get current HTML data from editor
        const currentData = this.editor.getData();
        if (CONFIG.DEBUG) {
          console.log("Current data length:", currentData.length);
          console.log(
            "Current data preview:",
            `${currentData.substring(0, 200)}...`
          );
        }

        // Clean the HTML data
        const cleanedData = this._cleanWordHtml(currentData);
        if (CONFIG.DEBUG) {
          console.log("Cleaned data length:", cleanedData.length);
          console.log(
            "Cleaned data preview:",
            `${cleanedData.substring(0, 200)}...`
          );
        }

        // Set the cleaned data back to editor
        if (cleanedData !== currentData) {
          this.editor.setData(cleanedData);
          if (CONFIG.DEBUG) {
            console.log("Word HTML artifacts removed successfully");
          }
        } else {
          if (CONFIG.DEBUG) {
            console.log("No Word HTML artifacts found to clean");
          }
        }
      }

      /**
       * Cleans Word HTML artifacts from raw HTML string.
       *
       * @param {string} html - The HTML string to clean
       * @return {string} - The cleaned HTML string
       */
      _cleanWordHtml(html) {
        if (!html || typeof html !== "string") {
          return html;
        }

        try {
          // Create a temporary container to parse HTML
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;

          // Clean all elements
          const allElements = tempDiv.querySelectorAll("*");
          if (CONFIG.DEBUG) {
            console.log(`Found ${allElements.length} elements to process`);
          }

          let elementsChanged = 0;

          for (let i = 0; i < allElements.length; i++) {
            if (this._cleanHtmlElement(allElements[i])) {
              elementsChanged++;
            }
          }

          if (CONFIG.DEBUG) {
            console.log(`Cleaned ${elementsChanged} elements`);
          }

          // Get the cleaned HTML
          let cleanedHTML = tempDiv.innerHTML;

          // Remove &nbsp; entities (both HTML entity and Unicode character)
          const originalLength = cleanedHTML.length;
          cleanedHTML = cleanedHTML
            .replace(/&nbsp;/g, " ")
            .replace(/\u00A0/g, " ");

          if (CONFIG.DEBUG && cleanedHTML.length !== originalLength) {
            console.log(
              `Removed ${originalLength - cleanedHTML.length} &nbsp; entities`
            );
          }

          // Remove empty paragraphs (after &nbsp; removal)
          tempDiv.innerHTML = cleanedHTML;
          const paragraphs = tempDiv.querySelectorAll("p");
          let emptyParagraphsRemoved = 0;

          for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            const textContent = p.textContent.trim();

            // Remove paragraph if it's empty or only contains whitespace
            if (textContent === "") {
              p.remove();
              emptyParagraphsRemoved++;
            }
          }

          if (CONFIG.DEBUG && emptyParagraphsRemoved > 0) {
            console.log(`Removed ${emptyParagraphsRemoved} empty paragraphs`);
          }
          if (emptyParagraphsRemoved > 0) {
            cleanedHTML = tempDiv.innerHTML;
          }

          // Return cleaned HTML
          return cleanedHTML;
        } catch (error) {
          if (CONFIG.DEBUG) {
            console.error("Error cleaning Word HTML:", error);
          }
          return html; // Return original on error
        }
      }

      /**
       * Cleans a single HTML DOM element.
       *
       * @param {Element} element - The DOM element to clean
       * @return {boolean} - True if any changes were made
       */
      _cleanHtmlElement(element) {
        let changed = false;

        // Remove ALL inline styles (aggressive cleaning)
        if (element.hasAttribute("style")) {
          element.removeAttribute("style");
          changed = true;
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
            changed = true;
          }
        }

        // Remove Word-specific attributes (excluding class and style which we handle above)
        for (let i = 0; i < CONFIG.WORD_ATTRIBUTES.length; i++) {
          const attr = CONFIG.WORD_ATTRIBUTES[i];
          if (
            attr !== "class" &&
            attr !== "style" &&
            element.hasAttribute(attr)
          ) {
            const value = element.getAttribute(attr);
            if (this._isWordSpecificValue(attr, value)) {
              element.removeAttribute(attr);
              changed = true;
            }
          }
        }

        return changed;
      }

      /**
       * Checks if an attribute value is Word-specific.
       *
       * @param {string} attribute - The attribute name
       * @param {string} value - The attribute value
       * @return {boolean} - True if the value is Word-specific
       */
      _isWordSpecificValue(attribute, value) {
        if (!value || typeof value !== "string") {
          return false;
        }

        switch (attribute) {
          case "class":
            for (let i = 0; i < CONFIG.WORD_CLASSES.length; i++) {
              if (value.includes(CONFIG.WORD_CLASSES[i])) {
                return true;
              }
            }
            return false;

          case "id":
            return (
              /^(OLE_LINK|_Toc|_Ref)\d*$/.test(value) ||
              value.includes("Word") ||
              value.includes("Office")
            );

          case "style":
            return (
              value.includes("mso-") ||
              value.includes("margin:0cm") ||
              value.includes("margin:0in") ||
              value.includes("line-height:115%")
            );

          case "lang":
            return value.length === 2;

          case "paraid":
          case "paraeid":
            return true;

          default:
            return false;
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
        const cleanedClasses = [];

        for (let i = 0; i < classes.length; i++) {
          const cls = classes[i];
          if (!cls.trim()) {
            continue;
          }

          let isWordClass = false;
          for (let j = 0; j < CONFIG.WORD_CLASSES.length; j++) {
            if (cls.includes(CONFIG.WORD_CLASSES[j])) {
              isWordClass = true;
              break;
            }
          }

          if (!isWordClass) {
            cleanedClasses.push(cls);
          }
        }

        return cleanedClasses.join(" ");
      }
    }

    // Export the plugin
    return {
      CleanStyle,
    };
  }
);
