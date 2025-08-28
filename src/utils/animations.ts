
export const setupScrollAnimations = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.1 }
  );
  
  const elements = document.querySelectorAll('.animate-on-scroll');
  elements.forEach(el => observer.observe(el));
  
  return () => {
    elements.forEach(el => observer.unobserve(el));
  };
};

export const setupMouseFollowEffect = () => {
  const handleMouseMove = (event: MouseEvent) => {
    const heroElements = document.querySelectorAll('.hero-parallax');
    
    heroElements.forEach((el: Element) => {
      const element = el as HTMLElement;
      const speed = parseFloat(element.getAttribute('data-speed') || '0.1');
      
      const x = (window.innerWidth - event.pageX * speed) / 100;
      const y = (window.innerHeight - event.pageY * speed) / 100;
      
      element.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
  };
  
  window.addEventListener('mousemove', handleMouseMove);
  
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
  };
};
