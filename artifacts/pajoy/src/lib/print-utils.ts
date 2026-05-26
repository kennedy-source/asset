/**
 * Print utility that prevents automatic screenshots
 * and provides controlled printing functionality
 */

export function safePrint(elementId?: string) {
  try {
    // Prevent any automatic screenshot behavior
    document.body.style.userSelect = "none";
    document.body.style.pointerEvents = "none";

    // If elementId is provided, only print that element
    if (elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        // Create a temporary print-only version
        const printContent = element.cloneNode(true) as HTMLElement;
        printContent.style.display = "block";
        printContent.style.position = "absolute";
        printContent.style.left = "0";
        printContent.style.top = "0";
        printContent.style.width = "100%";
        printContent.style.background = "white";
        printContent.style.zIndex = "9999";

        // Hide original content temporarily
        element.style.display = "none";

        // Add print content to body
        document.body.appendChild(printContent);

        // Print with minimal delay
        setTimeout(() => {
          window.print();

          // Clean up after print dialog closes
          setTimeout(() => {
            document.body.removeChild(printContent);
            element.style.display = "";
            document.body.style.userSelect = "";
            document.body.style.pointerEvents = "";
          }, 1000);
        }, 100);
      } else {
        // Fallback to regular print if element not found
        window.print();
        setTimeout(() => {
          document.body.style.userSelect = "";
          document.body.style.pointerEvents = "";
        }, 1000);
      }
    } else {
      // Regular print with safety measures
      window.print();
      setTimeout(() => {
        document.body.style.userSelect = "";
        document.body.style.pointerEvents = "";
      }, 1000);
    }
  } catch (error) {
    console.error("Print error:", error);
    // Restore body styles in case of error
    document.body.style.userSelect = "";
    document.body.style.pointerEvents = "";
  }
}

// Override window.print to prevent automatic screenshot behavior
export function preventAutoScreenshots() {
  const originalPrint = window.print;

  window.print = function () {
    // Disable automatic screenshot behavior
    document.body.style.userSelect = "none";
    document.body.style.pointerEvents = "none";

    // Call original print
    originalPrint.call(this);

    // Restore after print
    setTimeout(() => {
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    }, 1000);
  };
}
