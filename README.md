CKEditor Clean Styles for Drupal
================================

> **Note:** This module is no longer needed as of Drupal 10.6 and Drupal 11.3. These versions include CKEditor 5 with the updated "remove formatting" behavior that clears all inline styles, making this custom module obsolete.

![demo-of-editing](https://github.com/user-attachments/assets/e99659f1-fd00-4737-b753-26916d758cfd)

Provides a CKEditor 5 toolbar button for Drupal 10 and 11, labeled "Clean Text Styles", that removes unwanted text formatting artifacts from pasted content. It removes inline styles, Word-specific classes and attributes, and normalizes non‑breaking spaces.

This module was created as a stop-gap solution because older Drupal versions (10.5.x and earlier, 11.2.x and earlier) shipped with CKEditor v45, which had limited "remove formatting" functionality:

- **v45 and earlier**: The "remove formatting" button only clears CKEditor-specific styles
- **v46 and later**: The "remove formatting" button clears all inline styles

See: https://www.drupal.org/project/drupal/issues/3321254#comment-16451197

Read the a bit more about this in my post: [A stop-gap Drupal module to kill Word Junk in CKEditor 5](https://www.allaboutken.com/posts/20250919-killing-word-junk-drupal-ckeditor5-build-free-plugin/)

Requirements
------------

- Drupal core 10 or 11
- CKEditor 5 module (dependency: drupal:ckeditor5)

Installation
------------

Install as you would normally install a contributed Drupal module.

- With Drush:
  - `drush en ckeditor_clean_styles -y`
- Using DDEV (optional):
  - `ddev drush en ckeditor_clean_styles -y`

Configuration
-------------

1. Go to `Administration » Configuration » Content authoring » Text formats and editors`.
    - `/admin/config/content/formats`
2. Edit the text format where the button should be available (e.g. `Full HTML`).
3. In the CKEditor 5 toolbar builder, drag the "Clean Text Styles" button from Available buttons into the toolbar.
4. Save configuration.

Usage
-----

- Click the "Clean Text Styles" button in the editor toolbar to clean the current content.
- If a non-collapsed selection exists, only the selected content is cleaned; otherwise the entire editor content is cleaned:
  - Removes all inline `style` attributes
  - Removes document-specific CSS classes (e.g., `MsoNormal`, `SCXW`, `BCX`, etc.)
  - Removes document attributes such as `paraid`, `paraeid`, and certain `id` values used by Word
  - Replaces `&nbsp;` (and U+00A0) with regular spaces

Development
-----------

This plugin is intentionally build-free (no webpack, no npm dependencies). The CKEditor plugin is a small UMD bundle.

Workflow:

1. Edit `js/cleanStyle.js` directly
2. Clear Drupal caches: `drush cr` (or `ddev drush cr`)
3. Test in the editor

License
-------

GPL-2.0-or-later
