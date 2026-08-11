// AgriLeaf SPA Core Application Controller

// 1. Application State
const state = {
    currentUser: JSON.parse(sessionStorage.getItem('agrileaf_user')) || null,
    cart: JSON.parse(localStorage.getItem('agrileaf_cart')) || [],
    currentAdminTab: 'dashboard',
    activeFilters: 'All',
    searchQuery: '',
    faqQuery: ''
};

// 2. Global Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'info') iconClass = 'fa-circle-info';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove toast after animation completes
    setTimeout(() => {
        toast.style.animation = 'none';
        toast.offsetHeight; // Trigger reflow
        toast.style.transition = 'opacity 0.4s ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// 3. Authentication Hooks
function updateAuthUI() {
    const guestActions = document.getElementById('guest-actions');
    const userActions = document.getElementById('user-actions');
    const userNameDisplay = document.getElementById('user-name-display');
    const adminDashLink = document.getElementById('admin-dash-link');

    if (state.currentUser) {
        guestActions.style.display = 'none';
        userActions.style.display = 'flex';
        userNameDisplay.textContent = state.currentUser.name.split(' ')[0]; // Show first name

        if (state.currentUser.role === 'admin') {
            adminDashLink.style.display = 'flex';
        } else {
            adminDashLink.style.display = 'none';
        }
    } else {
        guestActions.style.display = 'flex';
        userActions.style.display = 'none';
    }
}

function handleLogin(email, password) {
    const user = window.agriDb.getUserByEmail(email);
    if (!user || user.password !== password) {
        showToast('Invalid email or password.', 'error');
        return false;
    }
    
    state.currentUser = user;
    sessionStorage.setItem('agrileaf_user', JSON.stringify(user));
    updateAuthUI();
    showToast(`Welcome back, ${user.name}!`);
    
    if (user.role === 'admin') {
        window.location.hash = '#/admin';
    } else {
        window.location.hash = '#/';
    }
    return true;
}

function handleSignup(name, email, password) {
    const userExists = window.agriDb.getUserByEmail(email);
    if (userExists) {
        showToast('Email address already registered.', 'error');
        return false;
    }

    const newUser = {
        email: email,
        name: name,
        password: password,
        role: 'customer'
    };

    const created = window.agriDb.createUser(newUser);
    if (created) {
        showToast('Sign up successful! Please log in.');
        window.location.hash = '#/login';
        return true;
    } else {
        showToast('Failed to create account.', 'error');
        return false;
    }
}

function handleLogout() {
    state.currentUser = null;
    sessionStorage.removeItem('agrileaf_user');
    updateAuthUI();
    showToast('Logged out successfully.');
    window.location.hash = '#/';
}

// 4. Shopping Cart System
function saveCart() {
    localStorage.setItem('agrileaf_cart', JSON.stringify(state.cart));
    updateCartUI();
}

function updateCartUI() {
    const cartCountElement = document.getElementById('global-cart-count');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSubtotalVal = document.getElementById('cart-subtotal-val');

    // Update count badge
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElement.textContent = totalCount;

    // Build sidebar list
    if (state.cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <i class="fa-solid fa-basket-shopping"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        cartSubtotalVal.textContent = '$0.00';
        return;
    }

    const dbProducts = window.agriDb.getProducts();
    let subtotal = 0;
    
    cartItemsContainer.innerHTML = state.cart.map(cartItem => {
        const product = dbProducts.find(p => p.id === cartItem.productId);
        if (!product) return '';
        
        const itemTotal = product.price * cartItem.quantity;
        subtotal += itemTotal;

        return `
            <div class="cart-item" data-product-id="${product.id}">
                <img src="${product.image}" alt="${product.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${product.name}</h4>
                    <span class="cart-item-price">$${product.price.toFixed(2)}</span>
                    <div class="cart-item-controls">
                        <button class="quantity-btn dec-qty" onclick="changeQuantity('${product.id}', -1)">-</button>
                        <span class="item-quantity">${cartItem.quantity}</span>
                        <button class="quantity-btn inc-qty" onclick="changeQuantity('${product.id}', 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${product.id}')" aria-label="Remove item">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    }).join('');

    cartSubtotalVal.textContent = `$${subtotal.toFixed(2)}`;
}

window.addToCart = function(productId, qty = 1) {
    const products = window.agriDb.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        showToast('Sorry, this product is out of stock.', 'error');
        return;
    }

    const existingIndex = state.cart.findIndex(item => item.productId === productId);
    if (existingIndex > -1) {
        const newQty = state.cart[existingIndex].quantity + qty;
        if (newQty > product.stock) {
            showToast(`Sorry, only ${product.stock} items are available in stock.`, 'error');
            return;
        }
        state.cart[existingIndex].quantity = newQty;
    } else {
        state.cart.push({ productId, quantity: qty });
    }

    saveCart();
    showToast(`Added ${product.name} to cart.`);
};

window.removeFromCart = function(productId) {
    state.cart = state.cart.filter(item => item.productId !== productId);
    saveCart();
    showToast('Item removed from cart.', 'info');
};

window.changeQuantity = function(productId, amount) {
    const index = state.cart.findIndex(item => item.productId === productId);
    if (index === -1) return;

    const products = window.agriDb.getProducts();
    const product = products.find(p => p.id === productId);

    const newQty = state.cart[index].quantity + amount;
    if (newQty <= 0) {
        removeFromCart(productId);
    } else if (newQty > product.stock) {
        showToast(`Sorry, only ${product.stock} units available in stock.`, 'error');
    } else {
        state.cart[index].quantity = newQty;
        saveCart();
    }
};

// Checkout Submission
function setupCheckoutForm() {
    const checkoutForm = document.getElementById('checkout-form');
    if (!checkoutForm) return;

    checkoutForm.onsubmit = function(e) {
        e.preventDefault();

        if (state.cart.length === 0) {
            showToast('Your shopping cart is empty.', 'error');
            return;
        }

        const name = document.getElementById('checkout-name').value;
        const address = document.getElementById('checkout-address').value;
        const phone = document.getElementById('checkout-phone').value;

        const dbProducts = window.agriDb.getProducts();
        let subtotal = 0;
        
        const items = state.cart.map(cartItem => {
            const product = dbProducts.find(p => p.id === cartItem.productId);
            subtotal += product.price * cartItem.quantity;
            return {
                productId: cartItem.productId,
                name: product.name,
                quantity: cartItem.quantity,
                price: product.price
            };
        });

        const newOrder = {
            customerEmail: state.currentUser ? state.currentUser.email : 'guest@agrileaf.com',
            customerName: name,
            items: items,
            total: subtotal,
            shippingAddress: address + ` (Phone: ${phone})`
        };

        const orderCreated = window.agriDb.createOrder(newOrder);
        if (orderCreated) {
            showToast(`Order ${orderCreated.id} placed successfully!`);
            state.cart = [];
            saveCart();
            document.getElementById('checkout-modal-overlay').classList.remove('show');
            checkoutForm.reset();
            
            // Redirect to home or details
            window.location.hash = '#/';
        } else {
            showToast('Could not process order. Out of stock or database issue.', 'error');
        }
    };
}

// 5. Page Renderers (Views)

// (A) Home Page
function renderHome() {
    const content = window.agriDb.getContent();
    const root = document.getElementById('app-root');

    root.innerHTML = `
        <!-- Hero Section -->
        <section class="hero">
            <div class="decor-dots"></div>
            <div class="container hero-grid">
                <div class="hero-content">
                    <h1>Smarter Agriculture for a <span>Greener Tomorrow</span></h1>
                    <p id="home-hero-subtitle">${content.heroSubtitle}</p>
                    <div class="hero-cta">
                        <a href="#/products" class="btn btn-accent">Shop Smart Products</a>
                        <a href="#/services" class="btn btn-outline">Advisory Bookings</a>
                    </div>
                </div>
                <div class="hero-visual">
                    <div class="hero-img-wrapper">
                        <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=700" alt="AgriLeaf Sustainable Agriculture">
                    </div>
                    <img src="https://assets.codepen.io/162656/leaf-decor.png" class="hero-leaf" alt="">
                </div>
            </div>
        </section>

        <!-- Why Choose AgriLeaf Section (Matches Screenshot Exactly) -->
        <section class="why-choose">
            <div class="container">
                <!-- Section Header -->
                <div class="section-header text-center">
                    <div class="badge">
                        <i class="fa-solid fa-leaf"></i> Why Choose AgriLeaf
                    </div>
                    <h2 id="home-why-title">${content.whyChooseTitle}</h2>
                    <p id="home-why-subtitle">${content.whyChooseSubtitle}</p>
                </div>

                <!-- Cards Grid -->
                <div class="why-grid">
                    <!-- Card 1: IoT -->
                    <div class="why-card">
                        <div class="card-icon">
                            <i class="fa-solid fa-wifi"></i>
                        </div>
                        <h3>IoT Real-time Feeds</h3>
                        <p>Always know your NPK moisture levels. Our solar-powered field sensors upload data hourly via cellular and LoRaWAN networks.</p>
                        <img src="images/iot_sensor.png" class="why-img" alt="IoT Real-time Feeds telemetry sensor">
                    </div>

                    <!-- Card 2: Bio-degradable -->
                    <div class="why-card">
                        <div class="card-icon">
                            <i class="fa-solid fa-leaf"></i>
                        </div>
                        <h3>Bio-Degradable Inputs</h3>
                        <p>We believe in feeding the soil biology, not just the plants. Our nutrients are certified organic and leave zero synthetic residues.</p>
                        <img src="images/bio_sprout.png" class="why-img" alt="Bio-Degradable biological agricultural inputs sprout">
                    </div>

                    <!-- Card 3: Centralized Dashboard -->
                    <div class="why-card">
                        <div class="card-icon">
                            <i class="fa-solid fa-chart-line"></i>
                        </div>
                        <h3>Centralized Dashboard</h3>
                        <p>Manage multiple zones or fields from a single dashboard. Track historical trends and trigger warning notifications immediately.</p>
                        <img src="images/dashboard_mockup.png" class="why-img" alt="Centralized agricultural monitoring dashboard analytic charts">
                    </div>
                </div>

                <!-- Stats Bar -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                        <div>
                            <div class="stat-number" id="home-stat-farmers">${content.statsFarmers}</div>
                            <div class="stat-label">Happy Farmers</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon"><i class="fa-solid fa-earth-americas"></i></div>
                        <div>
                            <div class="stat-number" id="home-stat-countries">${content.statsCountries}</div>
                            <div class="stat-label">Countries Served</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon"><i class="fa-solid fa-box-open"></i></div>
                        <div>
                            <div class="stat-number" id="home-stat-products">${content.statsProducts}</div>
                            <div class="stat-label">Smart Products</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon"><i class="fa-solid fa-face-smile"></i></div>
                        <div>
                            <div class="stat-number" id="home-stat-satisfaction">${content.statsSatisfaction}</div>
                            <div class="stat-label">Satisfaction Rate</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Newsletter CTA Banner -->
        <section class="cta-banner-primary">
            <div class="container" style="max-width: 700px;">
                <div class="badge" style="background-color: rgba(255,255,255,0.1); color: var(--accent);">Get Free Soil Advice</div>
                <h2 style="color: var(--white); font-size: 36px; margin-bottom: 16px;">Restoring Soil Biology, Maximizing Yields</h2>
                <p style="color: #e2e8f0; margin-bottom: 30px;">Sign up for our cooperative list to get technical brochures, agricultural studies, and early access to our crop telemetry releases.</p>
                <a href="#/signup" class="btn btn-accent">Create Farmer Account</a>
            </div>
        </section>
    `;
}

// (B) About Us Page
function renderAbout() {
    const content = window.agriDb.getContent();
    const root = document.getElementById('app-root');

    root.innerHTML = `
        <section class="about-hero">
            <div class="container">
                <h1>About Us</h1>
                <p style="max-width: 600px; margin: 16px auto 0 auto; color: #cbd5e1;">Pioneering smart technologies and organic microbiology inputs to empower regenerative farmers globally.</p>
            </div>
        </section>

        <section class="about-section">
            <div class="container about-grid">
                <div class="about-visual">
                    <img src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600" alt="Regenerative Organic Farm">
                    <div class="about-badge-floating">
                        <span class="number">2021</span>
                        <span>Established</span>
                    </div>
                </div>
                <div class="about-content">
                    <div class="badge"><i class="fa-solid fa-seedling"></i> Our Roots</div>
                    <h2>Our Mission & Vision</h2>
                    <p style="font-size: 16px; margin-bottom: 18px;">${content.aboutText}</p>
                    <p>We work closely with agronomists, software developers, and crop consultants to design accessible ecosystem analytics tools. By measuring exactly what the soil needs, growers can limit synthetic runoff and enhance organic microbiomes.</p>
                </div>
            </div>
        </section>

        <!-- Values Section -->
        <section style="padding: 80px 0;">
            <div class="container">
                <div class="section-header text-center">
                    <h2>Our Core Values</h2>
                    <p>The foundation of our dedication to farming and environmental restoration.</p>
                </div>
                <div class="values-grid">
                    <div class="value-item">
                        <i class="fa-solid fa-earth-green"></i>
                        <h3>Sustainability</h3>
                        <p>We build technologies that prioritize environmental stewardship and long-term soil structure restoration.</p>
                    </div>
                    <div class="value-item">
                        <i class="fa-solid fa-lightbulb"></i>
                        <h3>Innovation</h3>
                        <p>Bridging hardware sensors with microbiology inputs to create dynamic data-driven crop analysis.</p>
                    </div>
                    <div class="value-item">
                        <i class="fa-solid fa-handshake"></i>
                        <h3>Transparency</h3>
                        <p>Providing direct analytics and honest, certified organic inputs to guarantee chemical-free food crops.</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

// (C) Products Page
function renderProducts() {
    const root = document.getElementById('app-root');
    const products = window.agriDb.getProducts();

    // Filter and Search logic
    const filteredProducts = products.filter(p => {
        const matchesCategory = state.activeFilters === 'All' || p.category === state.activeFilters;
        const matchesSearch = p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                              p.description.toLowerCase().includes(state.searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    root.innerHTML = `
        <section class="shop-section">
            <div class="container">
                <div class="section-header text-center">
                    <div class="badge"><i class="fa-solid fa-cart-shopping"></i> AgriLeaf Store</div>
                    <h2>Our Smart Agricultural Inputs</h2>
                    <p>Equip your farm with advanced ecological inputs and live soil sensors designed for precision monitoring.</p>
                </div>

                <!-- Shop Controls -->
                <div class="shop-controls">
                    <!-- Filters -->
                    <ul class="filter-tabs">
                        <li class="filter-tab ${state.activeFilters === 'All' ? 'active' : ''}" data-filter="All">All Items</li>
                        <li class="filter-tab ${state.activeFilters === 'Sensors' ? 'active' : ''}" data-filter="Sensors">Sensors</li>
                        <li class="filter-tab ${state.activeFilters === 'Bio-inputs' ? 'active' : ''}" data-filter="Bio-inputs">Bio-Inputs</li>
                        <li class="filter-tab ${state.activeFilters === 'Devices' ? 'active' : ''}" data-filter="Devices">Devices</li>
                    </ul>

                    <!-- Search -->
                    <div class="search-box">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" id="product-search-input" placeholder="Search products..." value="${state.searchQuery}">
                    </div>
                </div>

                <!-- Products Grid -->
                <div class="product-grid" id="product-grid-container">
                    ${filteredProducts.length === 0 ? `
                        <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--gray-med);">
                            <i class="fa-solid fa-circle-info" style="font-size: 40px; margin-bottom: 16px; color: var(--border);"></i>
                            <p>No products found matching your criteria.</p>
                        </div>
                    ` : filteredProducts.map(p => {
                        const isLowStock = p.stock > 0 && p.stock <= 5;
                        const isOut = p.stock <= 0;
                        let stockLabel = `<span class="stock-status in-stock">In Stock (${p.stock})</span>`;
                        if (isLowStock) stockLabel = `<span class="stock-status low-stock">Low Stock (${p.stock} left)</span>`;
                        if (isOut) stockLabel = `<span class="stock-status out-of-stock">Out of Stock</span>`;

                        return `
                            <div class="product-card">
                                <div class="product-img-container">
                                    <img src="${p.image}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=400'">
                                    <span class="category-tag">${p.category}</span>
                                </div>
                                <div class="product-info">
                                    <div class="product-rating">
                                        <i class="fa-solid fa-star"></i>
                                        <span>${p.rating}</span>
                                    </div>
                                    <h3 class="product-title" onclick="openProductDetail('${p.id}')">${p.name}</h3>
                                    ${stockLabel}
                                    <p class="product-desc">${p.description}</p>
                                    <div class="product-footer">
                                        <span class="product-price">$${p.price.toFixed(2)}</span>
                                        <button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')" ${isOut ? 'disabled' : ''}>
                                            <i class="fa-solid fa-cart-plus"></i> Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </section>
    `;

    // Bind Filter Events
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.activeFilters = tab.getAttribute('data-filter');
            renderProducts();
        });
    });

    // Bind Search Input
    const searchInput = document.getElementById('product-search-input');
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        // Simple debouncing alternative
        const container = document.getElementById('product-grid-container');
        if (container) {
            // Rerender products based on search
            clearTimeout(window.searchDebounce);
            window.searchDebounce = setTimeout(() => {
                renderProducts();
            }, 300);
        }
    });
}

// Product Detail Modal
window.openProductDetail = function(productId) {
    const products = window.agriDb.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('global-modal');
    modal.innerHTML = `
        <div class="modal-wrapper" style="max-width: 650px;">
            <button class="modal-close" onclick="closeGlobalModal()"><i class="fa-solid fa-xmark"></i></button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px;">
                <div>
                    <img src="${product.image}" alt="${product.name}" style="border-radius: var(--radius-sm); object-fit: cover; width:100%; height:250px; background-color: var(--gray-light);" onerror="this.src='https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=400'">
                </div>
                <div>
                    <div class="badge" style="margin-bottom: 8px;">${product.category}</div>
                    <h2 style="font-size: 24px; margin-bottom: 12px;">${product.name}</h2>
                    <div class="product-rating" style="margin-bottom: 12px;">
                        <i class="fa-solid fa-star" style="color: #f59e0b;"></i>
                        <span>${product.rating} / 5.0 Rating</span>
                    </div>
                    <p style="font-size: 14px; margin-bottom: 20px; color: var(--gray-dark);">${product.description}</p>
                    <div style="font-size: 22px; font-weight: 700; color: var(--primary); margin-bottom: 20px;">$${product.price.toFixed(2)}</div>
                    
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button class="btn btn-accent" onclick="addToCart('${product.id}'); closeGlobalModal();" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-cart-shopping"></i> Add to Cart
                        </button>
                        <span style="font-size: 13px; font-weight: 600;">Stock: ${product.stock} units</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    modal.classList.add('show');
};

window.closeGlobalModal = function() {
    document.getElementById('global-modal').classList.remove('show');
};

// (D) Services Page
function renderServices() {
    const root = document.getElementById('app-root');

    root.innerHTML = `
        <section class="services-intro text-center">
            <div class="container" style="max-width: 800px;">
                <div class="badge"><i class="fa-solid fa-toolbox"></i> Our Services</div>
                <h2>Advisory & Smart Device Deployments</h2>
                <p style="font-size: 16px; color: var(--gray-dark); margin-top: 16px;">We help farms transition to smart technology. From professional NPK soil analysis mapping to physical solar installation setups, our consultants are ready to assist.</p>
            </div>
        </section>

        <!-- Services Grid -->
        <section style="padding: 20px 0;">
            <div class="container services-grid">
                <div class="service-card">
                    <div class="service-icon"><i class="fa-solid fa-chart-pie"></i></div>
                    <h3>Smart Farm Consulting</h3>
                    <p>An on-site agronomist performs soil maps, diagnoses nutrient deficiencies, and drafts a custom organic enhancement feeding calendar.</p>
                    <button class="btn btn-outline btn-sm" onclick="setServiceAndScroll('Smart Farm Consulting')">Book Service</button>
                </div>
                <div class="service-card">
                    <div class="service-icon"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                    <h3>IoT Field Installation</h3>
                    <p>Our engineers perform wireless surveys, install solar telemetry sensor masts, and link them to your central smartphone dashboard portal.</p>
                    <button class="btn btn-outline btn-sm" onclick="setServiceAndScroll('IoT Field Installation')">Book Service</button>
                </div>
                <div class="service-card">
                    <div class="service-icon"><i class="fa-solid fa-flask"></i></div>
                    <h3>Soil Analysis & Diagnostics</h3>
                    <p>Send soil samples directly to our partnered diagnostics labs. Receive detailed digital reports regarding trace minerals, carbon, and microbiology.</p>
                    <button class="btn btn-outline btn-sm" onclick="setServiceAndScroll('Soil Analysis & Diagnostics')">Book Service</button>
                </div>
            </div>
        </section>

        <!-- Booking Form Section -->
        <section id="booking-section-target" class="booking-section">
            <div class="container booking-grid">
                <div>
                    <div class="badge"><i class="fa-solid fa-calendar-check"></i> Direct Advisory</div>
                    <h2 style="font-size: 32px; margin-bottom: 20px;">Book a Consultation</h2>
                    <p style="margin-bottom: 24px;">Complete this advisory request. A certified AgriLeaf crop consultant will contact you within 24 hours to coordinate scheduling.</p>
                    <div style="display: flex; gap: 16px; align-items: center; background-color: var(--white); padding: 16px 24px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                        <i class="fa-solid fa-phone" style="font-size: 24px; color: var(--accent);"></i>
                        <div>
                            <div style="font-weight: 700; color: var(--primary);">Urgent Consultation?</div>
                            <div style="font-size: 14px; color: var(--gray-dark);">Call +1 (800) 555-LEAF</div>
                        </div>
                    </div>
                </div>
                <div class="booking-form-wrapper">
                    <form id="service-booking-form">
                        <div class="form-group">
                            <label for="booking-name">Full Name</label>
                            <input type="text" id="booking-name" class="form-control" placeholder="Ali Raza" required>
                        </div>
                        <div class="form-group">
                            <label for="booking-email">Email Address</label>
                            <input type="email" id="booking-email" class="form-control" placeholder="ali@farmland.com" required>
                        </div>
                        <div class="form-group">
                            <label for="booking-service">Selected Advisory Service</label>
                            <select id="booking-service" class="form-control" required>
                                <option value="">-- Select a Service --</option>
                                <option value="Smart Farm Consulting">Smart Farm Consulting</option>
                                <option value="IoT Field Installation">IoT Field Installation (NPK Nodes)</option>
                                <option value="Soil Analysis & Diagnostics">Soil Analysis & Diagnostics</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="booking-date">Requested Date</label>
                            <input type="date" id="booking-date" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="booking-message">Farm Description & Goals</label>
                            <textarea id="booking-message" class="form-control" placeholder="Describe your orchard crop type, acreage, and telemetry requirements..." required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Booking Request</button>
                    </form>
                </div>
            </div>
        </section>
    `;

    // Pre-populate service if user clicked from a card
    if (window.preSelectedService) {
        document.getElementById('booking-service').value = window.preSelectedService;
        window.preSelectedService = null;
    }

    // Submit Action
    document.getElementById('service-booking-form').onsubmit = function(e) {
        e.preventDefault();
        
        const booking = {
            name: document.getElementById('booking-name').value,
            email: document.getElementById('booking-email').value,
            service: document.getElementById('booking-service').value,
            date: document.getElementById('booking-date').value,
            message: document.getElementById('booking-message').value
        };

        const created = window.agriDb.createBooking(booking);
        if (created) {
            showToast('Consultation request submitted! We will email you shortly.');
            document.getElementById('service-booking-form').reset();
        } else {
            showToast('Unable to process request.', 'error');
        }
    };
}

window.setServiceAndScroll = function(serviceName) {
    window.preSelectedService = serviceName;
    const bookingForm = document.getElementById('booking-section-target');
    if (bookingForm) {
        bookingForm.scrollIntoView({ behavior: 'smooth' });
        const selectBox = document.getElementById('booking-service');
        if (selectBox) {
            selectBox.value = serviceName;
        }
    } else {
        window.location.hash = '#/services';
        // Delay to allow DOM update
        setTimeout(() => {
            const innerSection = document.getElementById('booking-section-target');
            if (innerSection) innerSection.scrollIntoView({ behavior: 'smooth' });
            const selectBox = document.getElementById('booking-service');
            if (selectBox) selectBox.value = serviceName;
        }, 100);
    }
};

// (E) Contact Page
function renderContact() {
    const root = document.getElementById('app-root');
    const content = window.agriDb.getContent();

    root.innerHTML = `
        <section class="contact-section">
            <div class="container">
                <div class="section-header text-center">
                    <div class="badge"><i class="fa-solid fa-envelope"></i> Get In Touch</div>
                    <h2>Contact AgriLeaf</h2>
                    <p>Have questions about crop telemetry or organic inputs? Send us an inquiry and our team will respond shortly.</p>
                </div>

                <div class="contact-grid">
                    <!-- Left: Details & Map -->
                    <div class="contact-details">
                        <div class="contact-item">
                            <div class="contact-icon"><i class="fa-solid fa-phone"></i></div>
                            <div class="contact-item-info">
                                <h3>Phone Support</h3>
                                <p>${content.contactPhone}</p>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-icon"><i class="fa-solid fa-envelope"></i></div>
                            <div class="contact-item-info">
                                <h3>Email Inquiries</h3>
                                <p>${content.contactEmail}</p>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-icon"><i class="fa-solid fa-location-dot"></i></div>
                            <div class="contact-item-info">
                                <h3>Corporate Headquarters</h3>
                                <p>${content.contactAddress}</p>
                            </div>
                        </div>

                        <!-- Google Maps Embed -->
                        <div class="google-map-wrapper">
                            <div class="map-label">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>786 Olive Branch Blvd, Green Valley, CA 94025</span>
                            </div>
                            <iframe
                                class="google-map-iframe"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3168.639290622951!2d-122.08624908469342!3d37.42199997982494!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808fb7495bec0189%3A0x7c17d44a466baf9b!2sGoogleplex!5e0!3m2!1sen!2sus!4v1691600000000!5m2!1sen!2sus"
                                width="100%"
                                height="260"
                                style="border: 0;"
                                allowfullscreen=""
                                loading="lazy"
                                referrerpolicy="no-referrer-when-downgrade"
                                title="AgriLeaf Headquarters - Green Valley, CA"
                            ></iframe>
                        </div>
                    </div>

                    <!-- Right: Form -->
                    <div class="booking-form-wrapper">
                        <h3 style="margin-bottom: 20px; font-size: 22px;">Send an Inquiry</h3>
                        <form id="contact-inquiry-form">
                            <div class="form-group">
                                <label for="contact-name">Your Full Name</label>
                                <input type="text" id="contact-name" class="form-control" placeholder="Sarah Peterson" required>
                            </div>
                            <div class="form-group">
                                <label for="contact-email">Email Address</label>
                                <input type="email" id="contact-email" class="form-control" placeholder="sarah@ecoagri.org" required>
                            </div>
                            <div class="form-group">
                                <label for="contact-subject">Inquiry Subject</label>
                                <input type="text" id="contact-subject" class="form-control" placeholder="Bulk Soil Sensor Order Details" required>
                            </div>
                            <div class="form-group">
                                <label for="contact-message">Message Details</label>
                                <textarea id="contact-message" class="form-control" placeholder="Write your questions here..." required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%;">Send Inquiry</button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Submit form action
    document.getElementById('contact-inquiry-form').onsubmit = function(e) {
        e.preventDefault();

        const inquiry = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            subject: document.getElementById('contact-subject').value,
            message: document.getElementById('contact-message').value
        };

        const created = window.agriDb.createInquiry(inquiry);
        if (created) {
            showToast('Message sent! Our support team will respond via email.');
            document.getElementById('contact-inquiry-form').reset();
        } else {
            showToast('Could not record your message.', 'error');
        }
    };
}

// (F) FAQ Page
function renderFAQ() {
    const root = document.getElementById('app-root');

    const defaultFaqs = [
        {
            q: "How do the IoT Soil Sensors work?",
            a: "The AgriLeaf NPK soil sensors utilize integrated optical and conductivity probes that penetrate the soil. Powered by a small top-mounted solar cell, they upload data once every hour via LoRaWAN (up to 10km range) or mobile cellular networks straight to our cloud platform."
        },
        {
            q: "Are the biological enhancers certified organic?",
            a: "Yes! Our Organic Bio-Enhancers are certified organic by USDA Organic standards. They are derived from cold-pressed kelp extracts, mycorrhizal fungi, and organic humus, leaving zero synthetic residues in the crops or soil."
        },
        {
            q: "What is the typical battery lifespan of a field telemetry node?",
            a: "Because the sensor operates on extremely low power and features solar recharging, the internal battery pack can run indefinitely under normal sunlight conditions. If completely covered, it can run on standby for up to 90 days."
        },
        {
            q: "Can I manage multiple farming zones under one dashboard?",
            a: "Absolutely. Our dashboard allows you to partition your farm into custom zones (e.g., Orchard-A, Field-B) and view aggregate telemetry stats or drill down to individual sensor locations."
        },
        {
            q: "Do you offer international shipping or consulting deployments?",
            a: "Yes, AgriLeaf currently ships products worldwide. For consulting bookings, we offer remote setup assistance globally, and local agronomy deployments in major farming sectors."
        }
    ];

    // Filter FAQs based on query
    const filteredFaqs = defaultFaqs.filter(faq => 
        faq.q.toLowerCase().includes(state.faqQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(state.faqQuery.toLowerCase())
    );

    root.innerHTML = `
        <section class="faq-section">
            <div class="container">
                <div class="section-header text-center">
                    <div class="badge"><i class="fa-solid fa-circle-question"></i> Help Center</div>
                    <h2>Frequently Asked Questions</h2>
                    <p>Find answers to common questions about AgriLeaf sensors, shipping, organic certifications, and advisory deployments.</p>
                </div>

                <!-- FAQ Search Box -->
                <div class="faq-search-wrapper">
                    <div class="search-box" style="width: 100%;">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" id="faq-search-input" placeholder="Search FAQs..." value="${state.faqQuery}">
                    </div>
                </div>

                <!-- FAQ Accordion List -->
                <div class="faq-list" id="faq-accordion-list">
                    ${filteredFaqs.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: var(--gray-med);">
                            <p>No answers match your search criteria. Please call support.</p>
                        </div>
                    ` : filteredFaqs.map((faq, index) => `
                        <div class="faq-item" data-index="${index}">
                            <div class="faq-question">
                                <span>${faq.q}</span>
                                <i class="fa-solid fa-chevron-down faq-toggle-icon"></i>
                            </div>
                            <div class="faq-answer">
                                <p>${faq.a}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    `;

    // Bind FAQ Click Events
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all first
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // FAQ Live Search event
    const faqSearch = document.getElementById('faq-search-input');
    faqSearch.addEventListener('input', (e) => {
        state.faqQuery = e.target.value;
        clearTimeout(window.faqDebounce);
        window.faqDebounce = setTimeout(() => {
            renderFAQ();
        }, 250);
    });
}

// (G) Login View
function renderLogin() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
        <section class="auth-section">
            <div class="auth-card">
                <div class="auth-header">
                    <h2>Farmer Login</h2>
                    <p style="color: var(--gray-med);">Access your telemetry dashboard & orders</p>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <label for="login-email">Email Address</label>
                        <input type="email" id="login-email" class="form-control" placeholder="farmer@agrileaf.com" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" class="form-control" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">Log In</button>
                </form>
                <div style="margin-top: 16px; padding: 16px; background-color: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: var(--radius-sm); font-size: 13px; color: var(--gray-dark);">
                    <div style="font-weight:700; color:var(--primary); margin-bottom:6px;"><i class="fa-solid fa-circle-info"></i> Demo Credentials:</div>
                    <div style="margin-bottom: 2px;"><strong>Admin:</strong> admin@agrileaf.com / admin123</div>
                    <div><strong>Customer:</strong> user@agrileaf.com / user123</div>
                </div>
                <div style="text-align: center; margin-top: 24px; border-top: 1px dashed var(--border); padding-top: 20px;">
                    <p style="color: var(--gray-med); font-size: 14px; margin-bottom: 12px;">Don't have an account?</p>
                    <a href="#/signup" class="btn btn-outline" style="width: 100%; font-size: 14px; padding: 10px 20px;">
                        <i class="fa-solid fa-user-plus"></i> Create New Account
                    </a>
                </div>
            </div>
        </section>
    `;

    document.getElementById('login-form').onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        handleLogin(email, pass);
    };
}

// (H) Signup View
function renderSignup() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
        <section class="auth-section">
            <div class="auth-card">
                <div class="auth-header">
                    <h2>Create Account</h2>
                    <p style="color: var(--gray-med);">Join our sustainable agricultural network</p>
                </div>
                <form id="signup-form">
                    <div class="form-group">
                        <label for="signup-name">Full Name</label>
                        <input type="text" id="signup-name" class="form-control" placeholder="Kamran Ali" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-email">Email Address</label>
                        <input type="email" id="signup-email" class="form-control" placeholder="farmer@farmnet.org" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" class="form-control" placeholder="Min 6 characters" minlength="6" required>
                    </div>
                    <button type="submit" class="btn btn-accent" style="width: 100%; margin-top: 8px;">Register Account</button>
                </form>
                <div style="text-align: center; margin-top: 24px; border-top: 1px dashed var(--border); padding-top: 20px;">
                    <p style="color: var(--gray-med); font-size: 14px; margin-bottom: 12px;">Already have an account?</p>
                    <a href="#/login" class="btn btn-outline" style="width: 100%; font-size: 14px; padding: 10px 20px;">
                        <i class="fa-solid fa-right-to-bracket"></i> Log In to Existing Account
                    </a>
                </div>
            </div>
        </section>
    `;

    document.getElementById('signup-form').onsubmit = function(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-password').value;
        handleSignup(name, email, pass);
    };
}

// (I) Protected Owner / Admin Dashboard View
function renderAdmin() {
    const root = document.getElementById('app-root');

    // Route Guard check
    if (!state.currentUser || state.currentUser.role !== 'admin') {
        showToast('Access denied. Administrator privileges required.', 'error');
        window.location.hash = '#/login';
        return;
    }

    // Read live data from DB to build statistics and tables
    const dbUsers = window.agriDb.getUsers();
    const dbProducts = window.agriDb.getProducts();
    const dbOrders = window.agriDb.getOrders();
    const dbBookings = window.agriDb.getBookings();
    const dbInquiries = window.agriDb.getInquiries();
    const content = window.agriDb.getContent();

    // Stats calculations
    const totalSales = dbOrders.reduce((sum, o) => o.status === 'Delivered' || o.status === 'Shipped' ? sum + o.total : sum, 0);
    const totalOrdersCount = dbOrders.length;
    const totalUsersCount = dbUsers.length;
    const pendingBookingsCount = dbBookings.filter(b => b.status === 'Pending').length;

    root.innerHTML = `
        <div class="admin-layout">
            <!-- Sidebar Navigation -->
            <div class="admin-sidebar">
                <div style="padding: 0 24px 20px 24px; border-bottom: 1px solid var(--primary-light); margin-bottom: 20px;">
                    <h3 style="color: var(--white); font-size: 16px;"><i class="fa-solid fa-lock" style="color: var(--accent);"></i> Owner Console</h3>
                    <span style="font-size: 12px; color: #94a3b8;">LoggedIn: Admin</span>
                </div>
                <ul class="admin-nav-list">
                    <li class="admin-nav-item ${state.currentAdminTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
                        <button><i class="fa-solid fa-chart-line"></i> Dashboard Info</button>
                    </li>
                    <li class="admin-nav-item ${state.currentAdminTab === 'products' ? 'active' : ''}" data-tab="products">
                        <button><i class="fa-solid fa-boxes-stacked"></i> Manage Shop</button>
                    </li>
                    <li class="admin-nav-item ${state.currentAdminTab === 'orders' ? 'active' : ''}" data-tab="orders">
                        <button><i class="fa-solid fa-truck-ramp-box"></i> Orders Board</button>
                    </li>
                    <li class="admin-nav-item ${state.currentAdminTab === 'users' ? 'active' : ''}" data-tab="users">
                        <button><i class="fa-solid fa-users-gear"></i> Users Manager</button>
                    </li>
                    <li class="admin-nav-item ${state.currentAdminTab === 'content' ? 'active' : ''}" data-tab="content">
                        <button><i class="fa-solid fa-pen-to-square"></i> Content Editor</button>
                    </li>
                    <li class="admin-nav-item ${state.currentAdminTab === 'inquiries' ? 'active' : ''}" data-tab="inquiries">
                        <button><i class="fa-solid fa-calendar-days"></i> Booking & Inbox</button>
                    </li>
                </ul>
            </div>

            <!-- Main Work Pane -->
            <div class="admin-main">
                <!-- Title Row -->
                <div class="admin-header">
                    <div class="admin-title-row">
                        <h2>System Control Center</h2>
                        <p style="color: var(--gray-med); font-size: 14px;">Review store purchases, update telemetry inventory, edit homepage headlines, and view advisories.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Exit Portal</button>
                </div>

                <!-- Stats Cards Row -->
                <div class="admin-stats-grid">
                    <div class="admin-stat-card">
                        <div class="admin-stat-icon sales"><i class="fa-solid fa-dollar-sign"></i></div>
                        <div class="admin-stat-info">
                            <h4>Sales Volume</h4>
                            <div class="admin-stat-value">$${totalSales.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-icon orders"><i class="fa-solid fa-box-open"></i></div>
                        <div class="admin-stat-info">
                            <h4>Total Orders</h4>
                            <div class="admin-stat-value">${totalOrdersCount}</div>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-icon users"><i class="fa-solid fa-users"></i></div>
                        <div class="admin-stat-info">
                            <h4>Registered Users</h4>
                            <div class="admin-stat-value">${totalUsersCount}</div>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-icon bookings"><i class="fa-solid fa-calendar-check"></i></div>
                        <div class="admin-stat-info">
                            <h4>Pending Bookings</h4>
                            <div class="admin-stat-value">${pendingBookingsCount}</div>
                        </div>
                    </div>
                </div>

                <!-- Tab Panels Containers -->
                <div id="admin-tab-content">
                    <!-- Target content will be loaded here dynamically -->
                </div>
            </div>
        </div>
    `;

    // Inner Tab Loaders dispatcher
    loadAdminTabContent();

    // Tab Switch click binder
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            state.currentAdminTab = item.getAttribute('data-tab');
            
            // Toggle active classes
            document.querySelectorAll('.admin-nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            loadAdminTabContent();
        });
    });
}

function loadAdminTabContent() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    if (state.currentAdminTab === 'dashboard') {
        renderAdminDashboardTab(container);
    } else if (state.currentAdminTab === 'products') {
        renderAdminProductsTab(container);
    } else if (state.currentAdminTab === 'orders') {
        renderAdminOrdersTab(container);
    } else if (state.currentAdminTab === 'users') {
        renderAdminUsersTab(container);
    } else if (state.currentAdminTab === 'content') {
        renderAdminContentTab(container);
    } else if (state.currentAdminTab === 'inquiries') {
        renderAdminInquiriesTab(container);
    }
}

// ADMIN SUB-TABS RENDERERS
function renderAdminDashboardTab(pane) {
    const orders = window.agriDb.getOrders().slice(0, 5); // Latest 5 orders
    const bookings = window.agriDb.getBookings().slice(0, 5); // Latest 5 bookings

    pane.innerHTML = `
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px;">
            <!-- Latest Sales -->
            <div class="admin-panel">
                <div class="panel-header">
                    <h3>Recent Transactions</h3>
                    <button class="btn btn-outline btn-sm" onclick="state.currentAdminTab='orders'; loadAdminTabContent();">All Orders</button>
                </div>
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.length === 0 ? '<tr><td colspan="4" class="text-center">No orders available.</td></tr>' : orders.map(o => `
                                <tr>
                                    <td><strong>${o.id}</strong></td>
                                    <td>${o.customerName}</td>
                                    <td>$${o.total.toFixed(2)}</td>
                                    <td><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Latest Bookings -->
            <div class="admin-panel">
                <div class="panel-header">
                    <h3>Upcoming Consultations</h3>
                    <button class="btn btn-outline btn-sm" onclick="state.currentAdminTab='inquiries'; loadAdminTabContent();">All Bookings</button>
                </div>
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Service</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.length === 0 ? '<tr><td colspan="4" class="text-center">No bookings.</td></tr>' : bookings.map(b => `
                                <tr>
                                    <td>${b.name}</td>
                                    <td style="font-size: 13px;">${b.service}</td>
                                    <td>${b.date}</td>
                                    <td><span class="status-badge ${b.status.toLowerCase()}">${b.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Tab: Manage Products
function renderAdminProductsTab(pane) {
    const products = window.agriDb.getProducts();

    pane.innerHTML = `
        <div class="admin-panel">
            <div class="panel-header">
                <h3>Product Telemetry Inventory</h3>
                <button class="btn btn-accent btn-sm" onclick="openAddProductModal()"><i class="fa-solid fa-plus"></i> New Product</button>
            </div>
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Unit Price</th>
                            <th>Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td><img src="${p.image}" alt="" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px; background-color: var(--gray-light);" onerror="this.src='https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=100'"></td>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.category}</td>
                                <td>$${p.price.toFixed(2)}</td>
                                <td>${p.stock}</td>
                                <td>
                                    <div class="action-btn-group">
                                        <button class="action-btn" onclick="openEditProductModal('${p.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                        <button class="action-btn delete" onclick="deleteProductHandler('${p.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.deleteProductHandler = function(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        window.agriDb.deleteProduct(id);
        showToast('Product deleted successfully.', 'info');
        loadAdminTabContent();
    }
};

window.openAddProductModal = function() {
    const modal = document.getElementById('global-modal');
    modal.innerHTML = `
        <div class="modal-wrapper">
            <button class="modal-close" onclick="closeGlobalModal()"><i class="fa-solid fa-xmark"></i></button>
            <h3 style="margin-bottom: 24px;">Add New Product</h3>
            <form id="admin-product-form">
                <div class="form-group">
                    <label for="prod-name">Product Name</label>
                    <input type="text" id="prod-name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="prod-category">Category</label>
                    <select id="prod-category" class="form-control" required>
                        <option value="Sensors">Sensors</option>
                        <option value="Bio-inputs">Bio-Inputs</option>
                        <option value="Devices">Devices</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="prod-price">Price ($)</label>
                    <input type="number" id="prod-price" class="form-control" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label for="prod-stock">Initial Stock Level</label>
                    <input type="number" id="prod-stock" class="form-control" min="0" required>
                </div>
                <div class="form-group">
                    <label for="prod-image">Image URL / Path</label>
                    <input type="text" id="prod-image" class="form-control" value="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=400">
                </div>
                <div class="form-group">
                    <label for="prod-desc">Description</label>
                    <textarea id="prod-desc" class="form-control" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Create Product</button>
            </form>
        </div>
    `;
    modal.classList.add('show');

    document.getElementById('admin-product-form').onsubmit = function(e) {
        e.preventDefault();
        const newProduct = {
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            price: parseFloat(document.getElementById('prod-price').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            image: document.getElementById('prod-image').value,
            description: document.getElementById('prod-desc').value,
            rating: 5.0
        };

        window.agriDb.saveProduct(newProduct);
        showToast('Product added successfully!');
        closeGlobalModal();
        loadAdminTabContent();
    };
};

window.openEditProductModal = function(id) {
    const products = window.agriDb.getProducts();
    const product = products.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById('global-modal');
    modal.innerHTML = `
        <div class="modal-wrapper">
            <button class="modal-close" onclick="closeGlobalModal()"><i class="fa-solid fa-xmark"></i></button>
            <h3 style="margin-bottom: 24px;">Edit Product: ${product.name}</h3>
            <form id="admin-product-edit-form">
                <div class="form-group">
                    <label for="prod-name">Product Name</label>
                    <input type="text" id="prod-name" class="form-control" value="${product.name}" required>
                </div>
                <div class="form-group">
                    <label for="prod-category">Category</label>
                    <select id="prod-category" class="form-control" required>
                        <option value="Sensors" ${product.category === 'Sensors' ? 'selected' : ''}>Sensors</option>
                        <option value="Bio-inputs" ${product.category === 'Bio-inputs' ? 'selected' : ''}>Bio-Inputs</option>
                        <option value="Devices" ${product.category === 'Devices' ? 'selected' : ''}>Devices</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="prod-price">Price ($)</label>
                    <input type="number" id="prod-price" class="form-control" step="0.01" min="0" value="${product.price}" required>
                </div>
                <div class="form-group">
                    <label for="prod-stock">Stock Level</label>
                    <input type="number" id="prod-stock" class="form-control" min="0" value="${product.stock}" required>
                </div>
                <div class="form-group">
                    <label for="prod-image">Image URL / Path</label>
                    <input type="text" id="prod-image" class="form-control" value="${product.image}">
                </div>
                <div class="form-group">
                    <label for="prod-desc">Description</label>
                    <textarea id="prod-desc" class="form-control" required>${product.description}</textarea>
                </div>
                <button type="submit" class="btn btn-accent" style="width: 100%;">Save Changes</button>
            </form>
        </div>
    `;
    modal.classList.add('show');

    document.getElementById('admin-product-edit-form').onsubmit = function(e) {
        e.preventDefault();
        const updated = {
            id: product.id,
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            price: parseFloat(document.getElementById('prod-price').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            image: document.getElementById('prod-image').value,
            description: document.getElementById('prod-desc').value,
            rating: product.rating
        };

        window.agriDb.saveProduct(updated);
        showToast('Product updated successfully!');
        closeGlobalModal();
        loadAdminTabContent();
    };
};

// Tab: Orders Board
function renderAdminOrdersTab(pane) {
    const orders = window.agriDb.getOrders();

    pane.innerHTML = `
        <div class="admin-panel">
            <div class="panel-header">
                <h3>Customer Purchases</h3>
            </div>
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer Name</th>
                            <th>Purchased Items</th>
                            <th>Address</th>
                            <th>Total Order</th>
                            <th>Status Control</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.length === 0 ? '<tr><td colspan="6" class="text-center">No orders placed yet.</td></tr>' : orders.map(o => `
                            <tr>
                                <td><strong>${o.id}</strong></td>
                                <td>${o.customerName}<br><span style="font-size:11px;color:var(--gray-med);">${o.customerEmail}</span></td>
                                <td style="font-size: 13px;">
                                    ${o.items.map(item => `${item.name} (x${item.quantity})`).join('<br>')}
                                </td>
                                <td style="font-size: 12px; max-width: 200px;">${o.shippingAddress}</td>
                                <td><strong>$${o.total.toFixed(2)}</strong></td>
                                <td>
                                    <select onchange="updateOrderStatusHandler('${o.id}', this.value)" class="form-control" style="padding: 6px 10px; font-size: 12px; width:120px; font-weight:600; border-color: var(--border);">
                                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                    </select>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.updateOrderStatusHandler = function(orderId, newStatus) {
    window.agriDb.updateOrderStatus(orderId, newStatus);
    showToast(`Order ${orderId} updated to ${newStatus}.`);
    // Re-render admin panel to update total sales calculations
    renderAdmin();
};

// Tab: Users Manager
function renderAdminUsersTab(pane) {
    const users = window.agriDb.getUsers();

    pane.innerHTML = `
        <div class="admin-panel">
            <div class="panel-header">
                <h3>Registered User Database</h3>
            </div>
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Email Address</th>
                            <th>Role Status</th>
                            <th>Registration Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td><strong>${u.name}</strong></td>
                                <td>${u.email}</td>
                                <td>
                                    <span class="status-badge ${u.role === 'admin' ? 'delivered' : 'pending'}" style="font-weight: 700;">
                                        ${u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                                <td>
                                    ${u.email.toLowerCase() === 'admin@agrileaf.com' ? '<span style="font-size:11px;color:var(--gray-med);">Protected Master</span>' : `
                                        <div class="action-btn-group">
                                            <button class="action-btn" onclick="toggleUserRoleHandler('${u.email}', '${u.role}')" title="Toggle Role"><i class="fa-solid fa-user-gear"></i></button>
                                            <button class="action-btn delete" onclick="deleteUserHandler('${u.email}')" title="Delete Account"><i class="fa-solid fa-trash-can"></i></button>
                                        </div>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.toggleUserRoleHandler = function(email, currentRole) {
    const targetRole = currentRole === 'admin' ? 'customer' : 'admin';
    if (confirm(`Do you want to change role of ${email} to ${targetRole}?`)) {
        window.agriDb.updateUserRole(email, targetRole);
        showToast('User role updated successfully.');
        loadAdminTabContent();
    }
};

window.deleteUserHandler = function(email) {
    if (confirm(`Are you sure you want to delete account ${email}?`)) {
        const deleted = window.agriDb.deleteUser(email);
        if (deleted) {
            showToast('User deleted.', 'info');
        } else {
            showToast('Error deleting user.', 'error');
        }
        loadAdminTabContent();
    }
};

// Tab: Content Manager
function renderAdminContentTab(pane) {
    const content = window.agriDb.getContent();

    pane.innerHTML = `
        <div class="admin-panel" style="max-width: 750px;">
            <div class="panel-header">
                <h3>Website Content Manager</h3>
            </div>
            <form id="admin-content-form">
                <h4 style="margin-bottom: 12px; color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 6px;">Hero Area Settings</h4>
                <div class="form-group">
                    <label for="c-hero-title">Hero Title Text</label>
                    <input type="text" id="c-hero-title" class="form-control" value="${content.heroTitle}" required>
                </div>
                <div class="form-group">
                    <label for="c-hero-sub">Hero Subtitle Description</label>
                    <textarea id="c-hero-sub" class="form-control" required>${content.heroSubtitle}</textarea>
                </div>

                <h4 style="margin-top: 30px; margin-bottom: 12px; color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 6px;">Why Choose Section</h4>
                <div class="form-group">
                    <label for="c-why-title">Why Choose Section Title</label>
                    <input type="text" id="c-why-title" class="form-control" value="${content.whyChooseTitle}" required>
                </div>
                <div class="form-group">
                    <label for="c-why-sub">Why Choose Section Subtitle</label>
                    <textarea id="c-why-sub" class="form-control" required>${content.whyChooseSubtitle}</textarea>
                </div>

                <h4 style="margin-top: 30px; margin-bottom: 12px; color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 6px;">Homepage Stats Counter</h4>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                    <div class="form-group">
                        <label for="c-stat-farmers">Happy Farmers</label>
                        <input type="text" id="c-stat-farmers" class="form-control" value="${content.statsFarmers}" required>
                    </div>
                    <div class="form-group">
                        <label for="c-stat-countries">Countries Served</label>
                        <input type="text" id="c-stat-countries" class="form-control" value="${content.statsCountries}" required>
                    </div>
                    <div class="form-group">
                        <label for="c-stat-products">Products Available</label>
                        <input type="text" id="c-stat-products" class="form-control" value="${content.statsProducts}" required>
                    </div>
                    <div class="form-group">
                        <label for="c-stat-satisfaction">Satisfaction Rate</label>
                        <input type="text" id="c-stat-satisfaction" class="form-control" value="${content.statsSatisfaction}" required>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 24px; width: 100%;">Save and Apply Content Changes</button>
            </form>
        </div>
    `;

    document.getElementById('admin-content-form').onsubmit = function(e) {
        e.preventDefault();

        const updatedContent = {
            heroTitle: document.getElementById('c-hero-title').value,
            heroSubtitle: document.getElementById('c-hero-sub').value,
            whyChooseTitle: document.getElementById('c-why-title').value,
            whyChooseSubtitle: document.getElementById('c-why-sub').value,
            statsFarmers: document.getElementById('c-stat-farmers').value,
            statsCountries: document.getElementById('c-stat-countries').value,
            statsProducts: document.getElementById('c-stat-products').value,
            statsSatisfaction: document.getElementById('c-stat-satisfaction').value
        };

        window.agriDb.updateContent(updatedContent);
        showToast('Website content configurations updated! Refreshed on Homepage.');
        // Re-render admin tab to show updated values
        loadAdminTabContent();
    };
}

// Tab: Booking & Inbox
function renderAdminInquiriesTab(pane) {
    const bookings = window.agriDb.getBookings();
    const inquiries = window.agriDb.getInquiries();

    pane.innerHTML = `
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px;">
            <!-- Service Bookings -->
            <div class="admin-panel">
                <div class="panel-header">
                    <h3>Farmers Consultation Requests</h3>
                </div>
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Farmer</th>
                                <th>Advisory Service</th>
                                <th>Date Requested</th>
                                <th>Description / Scope</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.length === 0 ? '<tr><td colspan="5" class="text-center">No advisories requested yet.</td></tr>' : bookings.map(b => `
                                <tr>
                                    <td><strong>${b.name}</strong><br><span style="font-size:11px;color:var(--gray-med);">${b.email}</span></td>
                                    <td><span style="font-size: 13px; font-weight:600; color:var(--primary-light);">${b.service}</span></td>
                                    <td>${b.date}</td>
                                    <td style="font-size: 12px; max-width: 180px;">${b.message}</td>
                                    <td>
                                        <select onchange="updateBookingStatusHandler('${b.id}', this.value)" class="form-control" style="padding: 6px; font-size: 11px; width:110px; font-weight:600;">
                                            <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                            <option value="Approved" ${b.status === 'Approved' ? 'selected' : ''}>Approved</option>
                                            <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Contact Messages Inbox -->
            <div class="admin-panel">
                <div class="panel-header">
                    <h3>Contact Center Inbox</h3>
                </div>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${inquiries.length === 0 ? '<p class="text-center text-muted">Inbox is completely clear!</p>' : inquiries.map(i => `
                        <div style="border: 1px solid var(--border); border-left: 4px solid ${i.status === 'Unread' ? '#ef4444' : 'var(--border)'}; padding: 16px; border-radius: var(--radius-sm); position: relative; background-color: ${i.status === 'Unread' ? '#fffafb' : 'var(--white)'};">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                                <strong>${i.name}</strong>
                                <span style="font-size: 11px; color: var(--gray-med);">${new Date(i.date).toLocaleDateString()}</span>
                            </div>
                            <div style="font-size: 12px; color: var(--gray-med); margin-bottom: 8px;">
                                Email: ${i.email} | Subject: <strong>${i.subject}</strong>
                            </div>
                            <p style="font-size: 13px; color: var(--gray-dark); margin-bottom: 12px; line-height:1.4;">${i.message}</p>
                            
                            ${i.status === 'Unread' ? `
                                <button class="btn btn-outline btn-sm" onclick="markInquiryReadHandler('${i.id}')" style="padding: 4px 10px; font-size: 11px;">
                                    <i class="fa-solid fa-envelope-open"></i> Mark Read
                                </button>
                            ` : `
                                <span class="status-badge read"><i class="fa-solid fa-check"></i> Read</span>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

window.updateBookingStatusHandler = function(id, newStatus) {
    window.agriDb.updateBookingStatus(id, newStatus);
    showToast(`Advisory request booking updated to ${newStatus}.`);
    renderAdmin();
};

window.markInquiryReadHandler = function(id) {
    window.agriDb.markInquiryRead(id);
    showToast('Inquiry marked as read.');
    renderAdmin();
};

// 6. Application Routing Engine
const routes = {
    '/': renderHome,
    '/about': renderAbout,
    '/products': renderProducts,
    '/services': renderServices,
    '/contact': renderContact,
    '/faq': renderFAQ,
    '/login': renderLogin,
    '/signup': renderSignup,
    '/admin': renderAdmin
};

function router() {
    let rawPath = window.location.hash || '#/';
    
    // Clean trailing slashes
    if (rawPath.startsWith('#')) {
        rawPath = rawPath.substring(1);
    }
    if (!rawPath.startsWith('/')) {
        rawPath = '/' + rawPath;
    }

    // Update Nav Active States
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        const routeAttr = '/' + link.getAttribute('data-route');
        
        // Exact match or Home match
        const isHomeMatch = (rawPath === '/' && routeAttr === '/home');
        const isMatch = rawPath === routeAttr;

        if (isMatch || isHomeMatch) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Close mobile nav on transition
    document.getElementById('mobile-nav-overlay').classList.remove('show');
    
    const pageRenderer = routes[rawPath] || renderHome;
    pageRenderer();
    
    // Always scroll to top on page navigate
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// 7. General Interactive UI Listeners & Boostrapping
document.addEventListener('DOMContentLoaded', () => {
    // Initialise UI
    updateAuthUI();
    updateCartUI();
    setupCheckoutForm();

    // Mobile Hamburger Toggle
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav-overlay');
    if (hamburgerBtn && mobileNav) {
        hamburgerBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('show');
            const icon = hamburgerBtn.querySelector('i');
            if (mobileNav.classList.contains('show')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });
    }

    // Shopping Cart Slider Trigger
    const cartTriggerBtn = document.getElementById('cart-trigger-btn');
    const cartSidebarOverlay = document.getElementById('cart-sidebar-overlay');
    const cartCloseBtn = document.getElementById('cart-close-btn');

    if (cartTriggerBtn && cartSidebarOverlay && cartCloseBtn) {
        cartTriggerBtn.addEventListener('click', () => {
            cartSidebarOverlay.classList.add('show');
        });
        cartCloseBtn.addEventListener('click', () => {
            cartSidebarOverlay.classList.remove('show');
        });
        // Click outside to close cart
        cartSidebarOverlay.addEventListener('click', (e) => {
            if (e.target === cartSidebarOverlay) {
                cartSidebarOverlay.classList.remove('show');
            }
        });
    }

    // User Dropdown Trigger Toggle
    const userBadgeTrigger = document.getElementById('user-badge-trigger');
    const headerUserDropdown = document.getElementById('header-user-dropdown');
    
    if (userBadgeTrigger && headerUserDropdown) {
        userBadgeTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            headerUserDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking anywhere else
        document.addEventListener('click', () => {
            headerUserDropdown.classList.remove('show');
        });
    }

    // Checkout Modal Dialog actions
    const checkoutTriggerBtn = document.getElementById('checkout-trigger-btn');
    const checkoutModalOverlay = document.getElementById('checkout-modal-overlay');
    const checkoutCloseBtn = document.getElementById('checkout-close-btn');

    if (checkoutTriggerBtn && checkoutModalOverlay && checkoutCloseBtn) {
        checkoutTriggerBtn.addEventListener('click', () => {
            if (state.cart.length === 0) {
                showToast('Your shopping cart is empty.', 'error');
                return;
            }
            
            // Pre-fill user data if logged in
            if (state.currentUser) {
                document.getElementById('checkout-name').value = state.currentUser.name;
            }

            cartSidebarOverlay.classList.remove('show'); // Close sidebar
            checkoutModalOverlay.classList.add('show');  // Open checkout modal
        });

        checkoutCloseBtn.addEventListener('click', () => {
            checkoutModalOverlay.classList.remove('show');
        });

        checkoutModalOverlay.addEventListener('click', (e) => {
            if (e.target === checkoutModalOverlay) {
                checkoutModalOverlay.classList.remove('show');
            }
        });
    }

    // Newsletter footer form submit
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.onsubmit = function(e) {
            e.preventDefault();
            showToast('Thank you for subscribing to our crop advisory newsletters!');
            newsletterForm.reset();
        };
    }

    // Logout Click
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Router Listeners
    window.addEventListener('hashchange', router);
    window.addEventListener('load', router);
});
