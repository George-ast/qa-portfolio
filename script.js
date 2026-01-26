document.addEventListener('DOMContentLoaded', () => {
  // Reset scroll position on page load (unless there's a hash)
  // We use a small timeout to ensure browser's own scroll restoration doesn't override this
  if (!window.location.hash) {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const header = document.querySelector('.site-header');
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  links.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });

  const setActiveLink = (id) => {
    links.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  };

  const updateActiveSection = () => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const bodyHeight = document.documentElement.scrollHeight;

    // Handle top of page explicitly
    if (scrollPosition < 100) {
      setActiveLink(sections[0].getAttribute('id'));
      return;
    }

    // Handle bottom of page
    if (scrollPosition + windowHeight >= bodyHeight - 100) {
      const lastId = sections[sections.length - 1].getAttribute('id');
      setActiveLink(lastId);
      return;
    }

    // Default scroll spy logic
    let currentId = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 150; // Offset for header + some buffer
      if (scrollPosition >= sectionTop) {
        currentId = section.getAttribute('id');
      }
    });

    if (currentId) {
      setActiveLink(currentId);
    }
  };

  window.addEventListener('scroll', () => {
    if (header) {
      const scrolled = window.scrollY > 12;
      header.style.boxShadow = scrolled ? '0 6px 18px rgba(17,24,39,0.08)' : 'none';
    }
    updateActiveSection();
  });

  // Run on load
  updateActiveSection();

  // --- Metaballs Animation (Interactive) ---
  const initMetaballs = () => {
    const container = document.getElementById('metaballs-bg');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0.5, 0.5);
    const targetMouse = new THREE.Vector2(0.5, 0.5);

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: mouse },
      u_color1: { value: new THREE.Color(0xf0f4ff) }, // --accent-soft
      u_color2: { value: new THREE.Color(0x8f9ed1) }  // --accent
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform vec3 u_color1;
        uniform vec3 u_color2;
        varying vec2 vUv;

        float blob(vec2 uv, vec2 pos, float size) {
          return size / length(uv - pos);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float ratio = u_resolution.x / u_resolution.y;
          vec2 mouse = u_mouse;
          
          uv.x *= ratio;
          mouse.x *= ratio;

          float t = u_time * 0.5;
          
          float m = 0.0;
          // Follower blob (mouse)
          m += blob(uv, mouse, 0.15);
          
          // Autonomous blobs
          m += blob(uv, vec2(0.5 * ratio + sin(t * 0.6) * 0.4, 0.5 + cos(t * 0.4) * 0.3), 0.12);
          m += blob(uv, vec2(0.5 * ratio + cos(t * 0.5) * 0.5, 0.5 + sin(t * 0.7) * 0.2), 0.1);
          m += blob(uv, vec2(0.2 * ratio + sin(t * 0.4) * 0.2, 0.8 + cos(t * 0.8) * 0.1), 0.08);

          vec3 bgColor = vec3(0.972, 0.976, 0.984); // #f8f9fb
          vec3 color = bgColor;
          
          if (m > 0.3) {
            color = mix(bgColor, u_color1, clamp((m - 0.3) * 1.5, 0.0, 1.0));
          }
          if (m > 0.8) {
            color = mix(color, u_color2, clamp((m - 0.8) * 2.0, 0.0, 1.0));
          }

          gl_FragColor = vec4(color, 0.45); // Balanced opacity
        }
      `,
      transparent: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const onMouseMove = (e) => {
      targetMouse.x = e.clientX / window.innerWidth;
      targetMouse.y = 1.0 - (e.clientY / window.innerHeight);
    };

    const onWindowResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      uniforms.u_resolution.value.set(width, height);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    const animate = (time) => {
      uniforms.u_time.value = time * 0.001;
      
      // Smooth mouse following (lerp)
      mouse.x += (targetMouse.x - mouse.x) * 0.1;
      mouse.y += (targetMouse.y - mouse.y) * 0.1;
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  initMetaballs();

  // --- Interactive Download Resume Button ---
  const initDownloadResumeButton = () => {
    const downloadBtn = document.getElementById('download-resume-btn');
    if (!downloadBtn) return;

    let hoverCount = 0;
    const MAX_HOVER_COUNT = 3;
    let isAnimating = false;
    let isReady = false;

    // Detect if device is mobile/touch device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || ('ontouchstart' in window) 
                     || (navigator.maxTouchPoints > 0);

    /**
     * Handles the fade out animation
     * @param {Function} callback - Function to call after fade out completes
     */
    const fadeOut = (callback) => {
      isAnimating = true;
      downloadBtn.classList.add('fade-out', 'animating');
      downloadBtn.classList.remove('move-up', 'move-down', 'ready');

      // Wait for fade out animation to complete (400ms)
      setTimeout(() => {
        if (callback) callback();
      }, 400);
    };

    /**
     * Handles the first hover/click: fade out then move up
     */
    const handleFirstInteraction = () => {
      fadeOut(() => {
        downloadBtn.classList.remove('fade-out');
        downloadBtn.classList.add('move-up');
        
        // Re-enable pointer events after animation completes
        setTimeout(() => {
          downloadBtn.classList.remove('animating');
          isAnimating = false;
        }, 400);
      });
    };

    /**
     * Handles the second hover/click: fade out then move down
     */
    const handleSecondInteraction = () => {
      fadeOut(() => {
        downloadBtn.classList.remove('fade-out');
        downloadBtn.classList.add('move-down');
        
        // Re-enable pointer events after animation completes
        setTimeout(() => {
          downloadBtn.classList.remove('animating');
          isAnimating = false;
        }, 400);
      });
    };

    /**
     * Handles the third interaction: return to original position and add fire effect
     */
    const handleThirdInteraction = () => {
      // First, fade out and return to original position
      fadeOut(() => {
        downloadBtn.classList.remove('fade-out', 'move-up', 'move-down');
        // Reset transform to original position
        downloadBtn.style.transform = 'translateY(0)';
        downloadBtn.style.opacity = '1';
        
        // Wait a bit, then add ready state with fire effect
        setTimeout(() => {
          downloadBtn.classList.remove('animating');
          downloadBtn.classList.add('ready');
          isAnimating = false;
          isReady = true;
        }, 100);
      });
    };

    /**
     * Main interaction handler (works for both hover and click)
     */
    const handleInteraction = () => {
      // Prevent interaction during animation
      if (isAnimating) return;

      hoverCount++;

      // Handle each interaction state based on count
      if (hoverCount === 1) {
        handleFirstInteraction();
      } else if (hoverCount === 2) {
        handleSecondInteraction();
      } else if (hoverCount >= MAX_HOVER_COUNT && !isReady) {
        handleThirdInteraction();
      }
    };

    /**
     * Handle resume download on click (only works when ready)
     */
    const handleDownload = (e) => {
      // If not ready, handle interaction sequence (mobile) or block (desktop)
      if (!isReady || !downloadBtn.classList.contains('ready')) {
        if (isMobile) {
          // On mobile, clicks trigger interaction sequence
          e.preventDefault();
          e.stopPropagation();
          // Only trigger interaction if not already animating
          if (!isAnimating) {
            handleInteraction();
          }
        } else {
          // On desktop, block clicks until ready
          e.preventDefault();
          e.stopPropagation();
        }
        return false;
      }

      // If ready, proceed with download
      if (downloadBtn.getAttribute('href') === '#resume') {
        e.preventDefault();
        
        // Create a temporary link to download the resume
        const link = document.createElement('a');
        link.href = 'resume.pdf';
        link.download = 'resume.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    // Use mouseenter for desktop, click for mobile
    if (isMobile) {
      // Mobile: use click events for both interaction and download
      downloadBtn.addEventListener('click', handleDownload);
    } else {
      // Desktop: use mouseenter for hover interaction
      downloadBtn.addEventListener('mouseenter', handleInteraction);
      // Desktop: use click only for download when ready
      downloadBtn.addEventListener('click', handleDownload);
    }
  };

  initDownloadResumeButton();
});

