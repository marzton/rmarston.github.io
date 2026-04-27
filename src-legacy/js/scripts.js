window.addEventListener('DOMContentLoaded', () => {
    let scrollPos = 0;
    const mainNav = document.getElementById('mainNav');
    const headerHeight = mainNav.clientHeight;
    let ticking = false;

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentTop = window.scrollY;
                if (currentTop < scrollPos) {
                    // Scrolling Up
                    if (currentTop > 0 && mainNav.classList.contains('is-fixed')) {
                        mainNav.classList.add('is-visible');
                    } else {
                        mainNav.classList.remove('is-visible', 'is-fixed');
                    }
                } else {
                    // Scrolling Down
                    mainNav.classList.remove('is-visible');
                    if (currentTop > headerHeight && !mainNav.classList.contains('is-fixed')) {
                        mainNav.classList.add('is-fixed');
                    }
                }
                scrollPos = currentTop;
                ticking = false;
            });

            ticking = true;
        }
    });
})
