// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Variables
let scene, camera, renderer, particles, particleGeometry;
let shakeCount = 0;
let isGiftClicked = false;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let santaStartX = 0;
let santaStartY = 0;
let velocity = { x: 0, y: 0 };
let dragDistance = 0;
let isResumeOpen = false; // NEW: Track resume modal state
let animationFrameId; // NEW: Track animation frame for proper cleanup

const santa = document.getElementById("santaCharacter");
const giftBox = document.getElementById("giftBox");
const resumeModal = document.getElementById("resumeModal");
const loader = document.getElementById("loader");
const progressBar = document.getElementById("progressBar");
const percentage = document.getElementById("percentage");

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Three.js initialization function - FIXED
function initThreeJS() {
  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("three-canvas"),
    alpha: true,
    antialias: true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Create particle system
  const particleCount = 800;
  particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    // Position
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = (Math.random() - 0.5) * 20;

    // Colors
    const color = new THREE.Color();
    color.setHSL(Math.random() * 0.1 + 0.05, 0.7, 0.5); // Orange-ish colors
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colors, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  camera.position.z = 5;
}

// Enhanced Loader functionality
function initLoader() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => {
        loader.classList.add("loaded");
        initPageAnimations();
      }, 500);
    }
    progressBar.style.width = progress + "%";
    percentage.textContent = Math.floor(progress) + "%";
  }, 200);
}

function initPageAnimations() {
  // Animate navigation
  gsap.to("#navbar", {
    y: 0,
    duration: 1,
    ease: "power3.out",
    delay: 0.5,
  });

  // Animate hero content
  gsap.to("#heroContent", {
    opacity: 1,
    y: 0,
    duration: 1.5,
    ease: "power3.out",
    delay: 0.8,
  });

  setupScrollAnimations();
}

// MODIFIED: Three.js animation with resume modal check
function animateThreeJS() {
  animationFrameId = requestAnimationFrame(animateThreeJS);

  // STOP particle animations when resume modal is open, but still render
  if (isResumeOpen) {
    renderer.render(scene, camera);
    return;
  }

  if (particles) {
    particles.rotation.x += 0.0003;
    particles.rotation.y += 0.0005;
    particles.position.y += Math.sin(Date.now() * 0.001) * 0.001;
  }

  renderer.render(scene, camera);
}

// ORIGINAL: Custom Cursor (KEEP AS IS - DON'T BLOCK)
if (!isMobile) {
  const cursor = document.querySelector(".cursor");
  const cursorTrail = document.querySelector(".cursor-trail");

  document.addEventListener("mousemove", (e) => {
    gsap.to(cursor, {
      x: e.clientX - 4,
      y: e.clientY - 4,
      duration: 0.1,
    });
    gsap.to(cursorTrail, {
      x: e.clientX - 15,
      y: e.clientY - 15,
      duration: 0.3,
    });
  });

  // Add cursor hover effects - MODIFIED: only block when interacting with santa/gift
  const hoverElements = document.querySelectorAll(
    "a, button, .santa-character, .gift-box, .project-card"
  );
  hoverElements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      // Only block santa/gift hover effects when resume is open
      if (isResumeOpen && (el.classList.contains('santa-character') || el.classList.contains('gift-box'))) {
        return;
      }
      gsap.to(cursor, { scale: 2, duration: 0.3 });
      gsap.to(cursorTrail, { scale: 1.5, duration: 0.3 });
    });
    el.addEventListener("mouseleave", () => {
      // Only block santa/gift hover effects when resume is open
      if (isResumeOpen && (el.classList.contains('santa-character') || el.classList.contains('gift-box'))) {
        return;
      }
      gsap.to(cursor, { scale: 1, duration: 0.3 });
      gsap.to(cursorTrail, { scale: 1, duration: 0.3 });
    });
  });
}

// Enhanced Santa Draggable Physics System + Double Click
let santaClickCount = 0;
let santaClickTimeout;

// Santa double-click handler
santa.addEventListener("click", (e) => {
  if (isResumeOpen) return; // BLOCK santa interactions when resume is open
  
  e.preventDefault();
  e.stopPropagation();
  
  santaClickCount++;
  
  if (santaClickCount === 1) {
    // First click - start timeout for double-click detection
    santaClickTimeout = setTimeout(() => {
      // Single click - just add a small bounce effect
      if (santaClickCount === 1) {
        gsap.to(santa, {
          scale: 1.05,
          duration: 0.2,
          ease: "back.out(1.7)",
          yoyo: true,
          repeat: 1,
        });
      }
      santaClickCount = 0;
    }, 300); // 300ms window for double-click
    
  } else if (santaClickCount === 2) {
    // Double click detected - clear timeout and drop gift
    clearTimeout(santaClickTimeout);
    santaClickCount = 0;
    
    // Trigger gift drop immediately on double-click
    triggerGiftDrop();
  }
});

function triggerGiftDrop() {
  if (giftBox.style.opacity === "1" || isResumeOpen) return;
  
  // Create celebration effect
  gsap.to(santa, {
    scale: 1.2,
    duration: 0.3,
    ease: "back.out(1.7)",
    yoyo: true,
    repeat: 1,
  });
  
  // Add flying particles effect
  createFlyingParticles();
  
  // Drop the gift
  dropGift();
  
  // Reset shake count
  shakeCount = 0;
}

santa.addEventListener("mousedown", startDrag);
santa.addEventListener("touchstart", startDrag);
document.addEventListener("mousemove", drag);
document.addEventListener("touchmove", drag);
document.addEventListener("mouseup", endDrag);
document.addEventListener("touchend", endDrag);

function startDrag(e) {
  if (isResumeOpen) return; // BLOCK only santa interactions when resume is open
  
  e.preventDefault();
  isDragging = true;

  const clientX = e.type.includes("touch")
    ? e.touches[0].clientX
    : e.clientX;
  const clientY = e.type.includes("touch")
    ? e.touches[0].clientY
    : e.clientY;

  dragStartX = clientX;
  dragStartY = clientY;

  const santaRect = santa.getBoundingClientRect();
  santaStartX = santaRect.left + santaRect.width / 2;
  santaStartY = santaRect.top + santaRect.height / 2;

  // Stop any ongoing animations
  gsap.killTweensOf(santa);

  // Visual feedback for drag start
  gsap.to(santa, {
    scale: 1.1,
    duration: 0.2,
    ease: "power2.out",
  });
}

function drag(e) {
  if (!isDragging || isResumeOpen) return; // BLOCK only drag when resume is open
  e.preventDefault();

  const clientX = e.type.includes("touch")
    ? e.touches[0].clientX
    : e.clientX;
  const clientY = e.type.includes("touch")
    ? e.touches[0].clientY
    : e.clientY;

  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;

  // Calculate drag distance for shake detection
  dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Update velocity for physics
  velocity.x = deltaX * 0.1;
  velocity.y = deltaY * 0.1;

  // Apply drag transform with constraints
  const maxDrag = 120;
  const constrainedX = Math.max(-maxDrag, Math.min(maxDrag, deltaX));
  const constrainedY = Math.max(-maxDrag, Math.min(maxDrag, deltaY));

  gsap.set(santa, {
    x: constrainedX,
    y: constrainedY,
    rotation: constrainedX * 0.15,
  });
}

function endDrag(e) {
  if (!isDragging || isResumeOpen) return; // BLOCK only drag when resume is open
  isDragging = false;

  // Count shake if drag distance is significant
  if (dragDistance > 40) {
    shakeCount++;

    // Create shake effect with physics
    gsap.to(santa, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 1.2,
      ease: "elastic.out(1, 0.3)",
      onComplete: () => {
        // Add bouncing effect
        gsap.to(santa, {
          y: -25,
          duration: 0.5,
          repeat: 1,
          yoyo: true,
          ease: "power2.out",
        });
      },
    });

    // Add flying particles effect
    createFlyingParticles();

    // Check if enough shakes to drop gift
    if (shakeCount >= 3) {
      setTimeout(() => {
        dropGift();
      }, 1000);
    }
  } else {
    // Return to original position smoothly
    gsap.to(santa, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.6,
      ease: "back.out(1.7)",
    });
  }

  dragDistance = 0;
}

function createFlyingParticles() {
  if (isResumeOpen) return; // BLOCK particle creation when resume is open
  
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `
              position: absolute;
              width: 6px;
              height: 6px;
              background: #ff6b35;
              border-radius: 50%;
              pointer-events: none;
              z-index: 1000;
          `;

    const santaRect = santa.getBoundingClientRect();
    particle.style.left = santaRect.left + santaRect.width / 2 + "px";
    particle.style.top = santaRect.top + santaRect.height / 2 + "px";

    document.body.appendChild(particle);

    gsap.to(particle, {
      x: (Math.random() - 0.5) * 150,
      y: (Math.random() - 0.5) * 150,
      opacity: 0,
      scale: 0,
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => particle.remove(),
    });
  }
}

function dropGift() {
  if (isResumeOpen) return; // BLOCK gift drop when resume is open
  
  // Gift drop animation
  gsap.to(giftBox, {
    opacity: 1,
    scale: 1,
    y: 0,
    duration: 1,
    ease: "bounce.out",
    onComplete: () => {
      // Add sparkle effect
      createSparkles();

      // Pulsing glow effect
      gsap.to(giftBox, {
        boxShadow: "0 0 50px rgba(255, 107, 53, 0.8)",
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
    },
  });

  shakeCount = 0;
}

function createSparkles() {
  if (isResumeOpen) return; // BLOCK sparkle creation when resume is open
  
  for (let i = 0; i < 12; i++) {
    const sparkle = document.createElement("div");
    sparkle.style.cssText = `
              position: absolute;
              width: 8px;
              height: 8px;
              background: #ff6b35;
              border-radius: 50%;
              pointer-events: none;
              z-index: 1000;
          `;

    const giftRect = giftBox.getBoundingClientRect();
    sparkle.style.left = giftRect.left + giftRect.width / 2 + "px";
    sparkle.style.top = giftRect.top + giftRect.height / 2 + "px";

    document.body.appendChild(sparkle);

    gsap.to(sparkle, {
      x: (Math.random() - 0.5) * 250,
      y: (Math.random() - 0.5) * 250,
      opacity: 0,
      scale: 0,
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => sparkle.remove(),
    });
  }
}

// Gift box single-click and double-click to show resume
let giftClickCount = 0;
let giftClickTimeout;

giftBox.addEventListener("click", (e) => {
  if (isResumeOpen) return; // BLOCK gift box interaction when resume is open
  
  e.preventDefault();
  e.stopPropagation();

  // Prevent multiple clicks during animation
  if (isGiftClicked) return;

  giftClickCount++;
  
  if (giftClickCount === 1) {
    // First click - start timeout for double-click detection
    giftClickTimeout = setTimeout(() => {
      // Single click - open resume after short delay
      if (giftClickCount === 1) {
        isGiftClicked = true;
        
        gsap.to(giftBox, {
          rotationY: 180,
          scale: 1.15,
          duration: 0.6,
          ease: "back.out(1.7)",
          onComplete: () => {
            showResume();
            gsap.to(giftBox, {
              scale: 1,
              rotationY: 0,
              duration: 0.3,
              onComplete: () => {
                setTimeout(() => {
                  isGiftClicked = false;
                }, 300);
              },
            });
          },
        });
      }
      giftClickCount = 0;
    }, 250); // 250ms window for double-click detection
    
  } else if (giftClickCount === 2) {
    // Double click detected - clear timeout and open resume with full animation
    clearTimeout(giftClickTimeout);
    giftClickCount = 0;
    isGiftClicked = true;

    gsap.to(giftBox, {
      rotationY: 360,
      scale: 1.3,
      duration: 0.8,
      ease: "back.out(1.7)",
      onComplete: () => {
        showResume();
        gsap.to(giftBox, {
          scale: 1,
          rotationY: 0,
          duration: 0.3,
          onComplete: () => {
            setTimeout(() => {
              isGiftClicked = false;
            }, 500);
          },
        });
      },
    });
  }
});

// MODIFIED: Show resume with proper state management
function showResume() {
  isResumeOpen = true; // SET resume state to open
  
  // STOP all background santa/gift interactions and animations
  gsap.killTweensOf(santa);
  gsap.killTweensOf(giftBox);
  
  // STOP any particle generation and remove existing ones
  const existingParticles = document.querySelectorAll('div[style*="position: absolute"][style*="background: #ff6b35"]');
  existingParticles.forEach(particle => {
    gsap.killTweensOf(particle);
    particle.remove();
  });

  resumeModal.classList.add("active");
  document.body.style.overflow = 'hidden'; // Disable background scroll

  // Reset all resume animations first
  gsap.set(".resume-section", { y: 0, opacity: 1 });
  gsap.set(".resume-container .skill-item", { scale: 1, opacity: 1 });

  // Animate resume sections with proper targeting
  gsap.fromTo(
    ".resume-section",
    {
      y: 30,
      opacity: 0,
    },
    {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.1,
      ease: "power3.out",
      delay: 0.2,
    }
  );

  // Animate skill items in resume modal specifically
  gsap.fromTo(
    ".resume-container .skill-item",
    {
      scale: 0,
      opacity: 0,
    },
    {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      stagger: 0.05,
      ease: "back.out(1.7)",
      delay: 0.8,
    }
  );
}

// MODIFIED: Close resume with proper state management
function closeResume() {
  isResumeOpen = false; // RESET resume state
  
  resumeModal.classList.remove("active");
  document.body.style.overflow = 'auto'; // Restore background scroll
  
  // Clear any GSAP tweens that might interfere with scrolling
  gsap.killTweensOf(window);
  gsap.killTweensOf(document.body);
  
  // RESTART santa animations after a delay
  setTimeout(() => {
    if (!isResumeOpen) { // Double check resume is still closed
      // Add any santa idle animations here if needed
    }
  }, 100);
}

// Close resume modal
document.getElementById("closeResume").addEventListener("click", closeResume);

// Resume link in nav
document.querySelector(".resume-link").addEventListener("click", (e) => {
  e.preventDefault();
  showResume();
});

// Close modal when clicking outside
resumeModal.addEventListener("click", (e) => {
  if (e.target === resumeModal) {
    closeResume();
  }
});

// ADDED: ESC key to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && resumeModal.classList.contains("active")) {
    closeResume();
  }
});

// Fixed Navigation Scrolling
document.querySelectorAll(".nav-menu a").forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    if (isResumeOpen) return; // BLOCK navigation when resume is open
    
    const href = this.getAttribute("href");

    // Skip resume link and handle section navigation
    if (this.classList.contains("resume-link")) {
      return;
    }

    if (href && href.startsWith("#")) {
      e.preventDefault();

      const targetId = href.substring(1);
      const target = document.getElementById(targetId);

      if (target) {
        gsap.to(window, {
          duration: 1.5,
          scrollTo: {
            y: target,
            offsetY: 100,
          },
          ease: "power2.inOut",
        });
      }
    }
  });
});

// Scroll Animations
function setupScrollAnimations() {
  // Section titles
  gsap.utils.toArray(".section-title").forEach((title) => {
    gsap.fromTo(
      title,
      {
        opacity: 0,
        y: 100,
      },
      {
        scrollTrigger: {
          trigger: title,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "power3.out",
      }
    );
  });

  // Section text
  gsap.utils.toArray(".section-text").forEach((text, i) => {
    gsap.fromTo(
      text,
      {
        opacity: 0,
        y: 50,
      },
      {
        scrollTrigger: {
          trigger: text,
          start: "top 85%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        delay: i * 0.1,
      }
    );
  });

  // Project cards
  gsap.utils.toArray(".project-card").forEach((card, i) => {
    gsap.fromTo(
      card,
      {
        opacity: 0,
        y: 80,
        rotationX: 15,
      },
      {
        scrollTrigger: {
          trigger: card,
          start: "top 90%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 1,
        ease: "power3.out",
        delay: i * 0.2,
      }
    );
  });

  // Skills grid (only for the main skills section, not resume)
  gsap.utils.toArray("#skills .skill-item").forEach((skill, i) => {
    gsap.fromTo(
      skill,
      {
        opacity: 0,
        scale: 0,
        rotation: -180,
      },
      {
        scrollTrigger: {
          trigger: skill,
          start: "top 90%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 0.6,
        ease: "back.out(1.7)",
        delay: i * 0.05,
      }
    );
  });

  // Form groups
  gsap.utils.toArray(".form-group").forEach((group, i) => {
    gsap.fromTo(
      group,
      {
        opacity: 0,
        x: -100,
      },
      {
        scrollTrigger: {
          trigger: group,
          start: "top 90%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: "power3.out",
        delay: i * 0.1,
      }
    );
  });

  // Submit button
  gsap.fromTo(
    ".submit-btn",
    {
      opacity: 0,
      scale: 0.8,
    },
    {
      scrollTrigger: {
        trigger: ".submit-btn",
        start: "top 90%",
        end: "bottom 20%",
        toggleActions: "play none none reverse",
      },
      opacity: 1,
      scale: 1,
      duration: 0.6,
      ease: "back.out(1.7)",
      delay: 0.5,
    }
  );
}

// Replace your current form submission handler with this:
document
  .getElementById("contactForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector(".submit-btn");
    const originalText = submitBtn.textContent;

    // Get form data
    const formData = new FormData(form);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    // Update button state
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.7";

    try {
      // ACTUAL API CALL TO YOUR BACKEND
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Real success from backend
        submitBtn.textContent = "Message Sent!";
        submitBtn.style.background =
          "linear-gradient(135deg, #4ecdc4, #44a08d)";

        // Reset form after success
        setTimeout(() => {
          form.reset();
          submitBtn.textContent = originalText;
          submitBtn.style.background =
            "linear-gradient(135deg, #ff6b35, #f7931e)";
          submitBtn.style.opacity = "1";
          submitBtn.disabled = false;
        }, 2000);
      } else {
        // Handle errors from backend
        throw new Error(result.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Form submission error:", error);

      // Show error message
      alert("Error: " + error.message + ". Please try again.");

      // Reset button on error
      submitBtn.textContent = originalText;
      submitBtn.style.background =
        "linear-gradient(135deg, #ff6b35, #f7931e)";
      submitBtn.style.opacity = "1";
      submitBtn.disabled = false;
    }
  });

// Status message helper function
function showStatus(message, type) {
  const statusDiv = document.getElementById("form-status");
  statusDiv.style.display = "block";
  statusDiv.textContent = message;

  if (type === "success") {
    statusDiv.style.background =
      "linear-gradient(135deg, #4ecdc4, #44a08d)";
    statusDiv.style.color = "white";
    statusDiv.style.border = "1px solid rgba(78, 205, 196, 0.3)";
  } else if (type === "error") {
    statusDiv.style.background =
      "linear-gradient(135deg, #ff6b6b, #ee5a52)";
    statusDiv.style.color = "white";
    statusDiv.style.border = "1px solid rgba(255, 107, 107, 0.3)";
  }

  // Hide status message after 5 seconds
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 5000);
}

// MODIFIED: Parallax effect with resume modal check
window.addEventListener("scroll", () => {
  if (isResumeOpen) return; // BLOCK parallax when resume is open
  
  const scrolled = window.pageYOffset;
  const heroContent = document.querySelector("#heroContent");

  if (heroContent && scrolled < window.innerHeight) {
    gsap.set(heroContent, {
      y: scrolled * 0.2,
    });
  }
});

// Resize handler
window.addEventListener("resize", () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// Initialize everything on page load
document.addEventListener("DOMContentLoaded", () => {
  initThreeJS();
  animateThreeJS();
  initLoader();
});

// MODIFIED: Additional interactive elements with resume modal check
document.addEventListener("mousemove", (e) => {
  if (isResumeOpen) return; // BLOCK particle mouse effects when resume is open
  
  const mouseX = e.clientX / window.innerWidth;
  const mouseY = e.clientY / window.innerHeight;

  // Move particles slightly based on mouse position
  if (particles) {
    gsap.to(particles.rotation, {
      x: mouseY * 0.1,
      y: mouseX * 0.1,
      duration: 2,
      ease: "power2.out",
    });
  }
});

// MODIFIED: Keyboard navigation with resume modal check
document.addEventListener("keydown", (e) => {
  if (isResumeOpen && e.key === "Escape") {
    closeResume();
    return;
  }
  
  if (isResumeOpen) return; // BLOCK keyboard navigation when resume is open
  
  const sections = ["home", "about", "projects", "skills", "contact"];
  let currentSection = 0;

  // Find current section based on scroll position
  sections.forEach((sectionId, index) => {
    const element = document.getElementById(sectionId);
    if (element && element.getBoundingClientRect().top <= 150) {
      currentSection = index;
    }
  });

  if (e.key === "ArrowDown" && currentSection < sections.length - 1) {
    e.preventDefault();
    const nextSection = document.getElementById(
      sections[currentSection + 1]
    );
    if (nextSection) {
      gsap.to(window, {
        duration: 1.5,
        scrollTo: { y: nextSection, offsetY: 100 },
        ease: "power2.inOut",
      });
    }
  } else if (e.key === "ArrowUp" && currentSection > 0) {
    e.preventDefault();
    const prevSection = document.getElementById(
      sections[currentSection - 1]
    );
    if (prevSection) {
      gsap.to(window, {
        duration: 1.5,
        scrollTo: { y: prevSection, offsetY: 100 },
        ease: "power2.inOut",
      });
    }
  }
});

// MODIFIED: Touch/swipe gestures for mobile with resume modal check
let startY = 0;
let startX = 0;

document.addEventListener("touchstart", (e) => {
  if (isResumeOpen) return; // BLOCK touch gestures when resume is open
  startY = e.touches[0].clientY;
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", (e) => {
  if (isResumeOpen) return; // BLOCK touch gestures when resume is open
  
  const endY = e.changedTouches[0].clientY;
  const endX = e.changedTouches[0].clientX;
  const diffY = startY - endY;
  const diffX = startX - endX;

  // Only trigger if it's more vertical than horizontal
  if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 50) {
    const sections = ["home", "about", "projects", "skills", "contact"];
    let currentSection = 0;

    sections.forEach((sectionId, index) => {
      const element = document.getElementById(sectionId);
      if (element && element.getBoundingClientRect().top <= 150) {
        currentSection = index;
      }
    });

    if (diffY > 0 && currentSection < sections.length - 1) {
      // Swipe up - go to next section
      const nextSection = document.getElementById(
        sections[currentSection + 1]
      );
      if (nextSection) {
        gsap.to(window, {
          duration: 1.5,
          scrollTo: { y: nextSection, offsetY: 100 },
          ease: "power2.inOut",
        });
      }
    } else if (diffY < 0 && currentSection > 0) {
      // Swipe down - go to previous section
      const prevSection = document.getElementById(
        sections[currentSection - 1]
      );
      if (prevSection) {
        gsap.to(window, {
          duration: 1.5,
          scrollTo: { y: prevSection, offsetY: 100 },
          ease: "power2.inOut",
        });
      }
    }
  }
});

(function () {
  "use strict";

  // Prevent multiple initializations
  if (window.contactFormInitialized) {
    return;
  }
  window.contactFormInitialized = true;

  let isSubmitting = false;

  const fields = {
    name: { min: 2, max: 100, required: true },
    email: { email: true, required: true },
    subject: { min: 5, max: 200, required: true },
    message: { min: 10, max: 1000, required: true },
  };

  function validateField(fieldName) {
    const input = document.getElementById(fieldName);
    const error = document.getElementById(fieldName + "Error");
    const count = document.getElementById(fieldName + "Count");

    if (!input) return false;

    const value = input.value.trim();
    const rules = fields[fieldName];
    let isValid = true;
    let errorMsg = "";

    if (rules.required && !value) {
      isValid = false;
      errorMsg = `${
        fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
      } is required`;
    } else if (value && rules.min && value.length < rules.min) {
      isValid = false;
      errorMsg = `Must be at least ${rules.min} characters`;
    } else if (value && rules.max && value.length > rules.max) {
      isValid = false;
      errorMsg = `Cannot exceed ${rules.max} characters`;
    } else if (
      value &&
      rules.email &&
      !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value)
    ) {
      isValid = false;
      errorMsg = "Please enter a valid email";
    }

    input.classList.remove("valid", "invalid");
    if (value) {
      input.classList.add(isValid ? "valid" : "invalid");
    }

    if (error) {
      error.textContent = errorMsg;
      error.classList.toggle("success", isValid && value);
      if (isValid && value) error.textContent = "Looks good!";
    }

    if (count) {
      count.textContent = value.length;
      const container = count.parentElement;
      container.classList.remove("warning", "danger");
      if (value.length > rules.max * 0.9)
        container.classList.add("danger");
      else if (value.length > rules.max * 0.7)
        container.classList.add("warning");
    }

    return isValid;
  }

  function updateSubmitButton() {
    const btn = document.getElementById("submitBtn");
    if (isSubmitting) return;

    const allValid = Object.keys(fields).every((field) => {
      const input = document.getElementById(field);
      return input && validateFieldSilent(field, input.value.trim());
    });

    btn.disabled = !allValid;
  }

  function validateFieldSilent(fieldName, value) {
    const rules = fields[fieldName];
    if (rules.required && !value) return false;
    if (value && rules.min && value.length < rules.min) return false;
    if (value && rules.max && value.length > rules.max) return false;
    if (
      value &&
      rules.email &&
      !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value)
    )
      return false;
    return true;
  }

  function showStatus(message, type) {
    const status = document.getElementById("form-status");
    status.textContent = message;
    status.className = `form-status show ${type}`;

    if (type !== "success") {
      setTimeout(() => status.classList.remove("show"), 5000);
    }
  }

  // Initialize on DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    Object.keys(fields).forEach((fieldName) => {
      const input = document.getElementById(fieldName);
      if (input) {
        input.addEventListener("input", () => {
          validateField(fieldName);
          updateSubmitButton();
        });
        input.addEventListener("blur", () => validateField(fieldName));
      }
    });

    const form = document.getElementById("contactForm");
    if (form) {
      form.addEventListener(
        "submit",
        async function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();

          if (isSubmitting) {
            return false;
          }

          const btn = document.getElementById("submitBtn");
          const status = document.getElementById("form-status");

          // Validate all fields
          const allValid = Object.keys(fields).every((field) =>
            validateField(field)
          );
          if (!allValid) {
            showStatus(
              "Please fix validation errors before submitting.",
              "error"
            );
            return false;
          }

          // Set submitting state
          isSubmitting = true;
          btn.disabled = true;
          btn.classList.add("loading");
          btn.textContent = "Sending...";
          status.classList.remove("show");

          try {
            const formData = new FormData(form);
            const data = {
              name: formData.get("name"),
              email: formData.get("email"),
              subject: formData.get("subject"),
              message: formData.get("message"),
            };

            const response = await fetch("/api/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok && result.success) {
              btn.classList.remove("loading");
              btn.classList.add("success");
              btn.textContent = "Message Sent!";
              showStatus(
                result.message || "Message sent successfully!",
                "success"
              );

              setTimeout(() => {
                form.reset();
                Object.keys(fields).forEach((field) => {
                  const input = document.getElementById(field);
                  const error = document.getElementById(field + "Error");
                  const count = document.getElementById(field + "Count");

                  if (input) input.classList.remove("valid", "invalid");
                  if (error) error.textContent = "";
                  if (count) {
                    count.textContent = "0";
                    count.parentElement.classList.remove(
                      "warning",
                      "danger"
                    );
                  }
                });

                isSubmitting = false;
                btn.classList.remove("success");
                btn.textContent = "Send Message";
                btn.disabled = true;
                status.classList.remove("show");
              }, 3000);
            } else {
              throw new Error(result.message || "Failed to send message");
            }
          } catch (error) {
            console.error("Submit error:", error);
            showStatus("Error: " + error.message, "error");

            isSubmitting = false;
            btn.classList.remove("loading");
            btn.textContent = "Send Message";
            updateSubmitButton();
          }

          return false;
        },
        { once: false }
      );
    }

    updateSubmitButton();
  });
})();
