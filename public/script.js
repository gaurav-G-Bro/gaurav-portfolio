// public/scripts.js
document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".download-resume");
    if (button) {
      button.addEventListener("click", downloadResume);
    }
  });
  
  function downloadResume() {
    try {
      const driveFileId = "1roC8XOG6P_FLeDoqrQpS4BBKcLaAeSaY";
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "Gaurav_Kumar_Resume.pdf";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  
      const button = document.querySelector(".download-resume");
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = "<span>✅</span> Opening Download...";
        button.style.background = "linear-gradient(135deg, #4ecdc4, #44a08d)";
  
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.background = "linear-gradient(135deg, #ff6b35, #f7931e)";
        }, 3000);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to initiate download. Please try again or check the file link.");
    }
  }
  