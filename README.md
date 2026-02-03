# QuickPoint

A lightweight, dependency-free HTML presentation framework.

## Structure

- **src/**: Core framework files (`index.html`, `js/`, `css/`).
- **examples/**: Example slides and configuration.

## Features
- **Zero Build Step**: Just edit HTML files and refresh.
- **Presenter View**: Separate window with timer, next slide preview, and speaker notes.
- **Pure Web Tech**: No frameworks, just HTML, CSS, and JS.
- **Deep Linking**: Share URLs to specific slides.

## Getting Started

1.  **Serve the directory**: Run a local web server from the **ROOT** of the project.

    *   **VS Code**: Right-click the root folder and "Open with Live Server" (or ensure the server root is the project root, not `src`).
    *   **Python**: Run `python3 -m http.server` in the project root.
    *   **Node**: Run `npx serve` in the project root.

2.  **Open the Presentation**: Navigate to `http://localhost:8000/src/index.html`.

3.  **Presenter View**: Click the **"P"** button (hover bottom-right) to open the Presenter View.

## Customizing

1.  **Add Slides**: Create HTML files in `examples/slides/` (or any folder).
2.  **Configure**: Edit `examples/config.json`. Update the paths to point to your new slides (relative to `src/index.html`).

```json
{
    "slides": [
        "../examples/slides/my-new-slide.html"
    ]
}
```

## Slide Format
Any HTML content works. To add speaker notes:

```html
<h1>My Slide</h1>
<p>Content...</p>

<div class="notes">
    <p>Don't forget to mention this point!</p>
</div>
```
