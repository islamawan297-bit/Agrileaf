// AgriLeaf Client-Side Persistent Database Management
const DB_KEY = 'agrileaf_db';

// Initial data to populate the simulated database on first run
const initialData = {
    users: [
        {
            email: 'admin@agrileaf.com',
            name: 'AgriLeaf Admin',
            password: 'admin123',
            role: 'admin',
            createdAt: '2026-08-01T12:00:00Z'
        },
        {
            email: 'user@agrileaf.com',
            name: 'Kamran Ali (Farmer)',
            password: 'user123',
            role: 'customer',
            createdAt: '2026-08-05T10:30:00Z'
        }
    ],
    products: [
        {
            id: 'p1',
            name: 'Smart NPK Soil Sensor',
            price: 185.00,
            category: 'Sensors',
            description: 'Solar-powered IoT field telemetry sensor measuring Nitrogen, Phosphorus, Potassium levels, and soil moisture in real-time. Features LoRaWAN & cellular connectivity.',
            image: 'images/iot_sensor.png',
            stock: 35,
            rating: 4.8
        },
        {
            id: 'p2',
            name: 'Organic Bio-Enhancer',
            price: 45.00,
            category: 'Bio-inputs',
            description: 'Premium microbial soil enhancer designed to restore biology, stimulate root growth, and maximize nutrient uptake without synthetic chemical residues.',
            image: 'images/bio_sprout.png',
            stock: 120,
            rating: 4.9
        },
        {
            id: 'p3',
            name: 'Smart Irrigation Controller',
            price: 299.00,
            category: 'Devices',
            description: 'Intelligent multi-zone irrigation valve system that triggers watering based on live IoT sensor readings and localized weather predictions.',
            image: 'https://images.unsplash.com/photo-1463121859909-073bad6d3e84?auto=format&fit=crop&q=80&w=400',
            stock: 15,
            rating: 4.7
        },
        {
            id: 'p4',
            name: 'Seed Starter Grow Kit',
            price: 25.00,
            category: 'Bio-inputs',
            description: 'All-in-one organic planting kit including bio-degradable seed starter pots, organic soil mix, and high-germination heirloom vegetable seeds.',
            image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=400',
            stock: 80,
            rating: 4.6
        },
        {
            id: 'p5',
            name: 'Handheld Soil pH Probe',
            price: 75.00,
            category: 'Sensors',
            description: 'Rugged, portable digital tester for checking soil pH and temperature. Features clear LCD screen and instant, calibrated readings.',
            image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
            stock: 22,
            rating: 4.5
        },
        {
            id: 'p6',
            name: 'Botanical Pest Repellent',
            price: 32.00,
            category: 'Bio-inputs',
            description: '100% natural crop protection spray derived from cold-pressed neem and botanical extracts. Completely safe for beneficial insects like bees.',
            image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400',
            stock: 50,
            rating: 4.4
        }
    ],
    orders: [
        {
            id: 'AL-1001',
            customerEmail: 'user@agrileaf.com',
            customerName: 'Kamran Ali',
            items: [
                { productId: 'p1', name: 'Smart NPK Soil Sensor', quantity: 2, price: 185.00 },
                { productId: 'p2', name: 'Organic Bio-Enhancer', quantity: 3, price: 45.00 }
            ],
            total: 505.00,
            status: 'Delivered',
            date: '2026-08-06T15:20:00Z',
            shippingAddress: 'Plot 45, Agro Sector, Multan, Pakistan'
        },
        {
            id: 'AL-1002',
            customerEmail: 'user@agrileaf.com',
            customerName: 'Kamran Ali',
            items: [
                { productId: 'p3', name: 'Smart Irrigation Controller', quantity: 1, price: 299.00 }
            ],
            total: 299.00,
            status: 'Shipped',
            date: '2026-08-08T09:15:00Z',
            shippingAddress: 'Plot 45, Agro Sector, Multan, Pakistan'
        }
    ],
    bookings: [
        {
            id: 'B-2001',
            name: 'Kamran Ali',
            email: 'user@agrileaf.com',
            service: 'Smart Farm Consulting',
            date: '2026-08-15',
            status: 'Approved',
            message: 'Need help planning the NPK sensor layout for my 10-acre citrus orchard.'
        },
        {
            id: 'B-2002',
            name: 'Zahid Khan',
            email: 'zahid@farmnet.com',
            service: 'Soil Analysis & Diagnostics',
            date: '2026-08-18',
            status: 'Pending',
            message: 'Experiencing yellowing leaves on wheat crops. Need an expert diagnostic report.'
        }
    ],
    inquiries: [
        {
            id: 'I-3001',
            name: 'Sarah Peterson',
            email: 'sarah.p@ecoagri.org',
            subject: 'Bulk Sensor Order Query',
            message: 'Hello, we are interested in deploying 50 NPK soil sensors for our cooperative farm. Do you offer volume discounts?',
            date: '2026-08-09T14:40:00Z',
            status: 'Unread'
        }
    ],
    content: {
        heroTitle: 'Smarter Agriculture for a Greener Tomorrow',
        heroSubtitle: 'Deploy IoT soil telemetry and organic biologicals to maximize crop yields while preserving the planet.',
        whyChooseTitle: 'Why Farmers Trust AgriLeaf',
        whyChooseSubtitle: 'We deliver an integrated ecosystem connecting hardware analytics with biological enhancers.',
        statsFarmers: '10K+',
        statsCountries: '50+',
        statsProducts: '200+',
        statsSatisfaction: '98%',
        aboutText: 'AgriLeaf was founded with a single mission: to build a sustainable future for agricultural production. By uniting advanced hardware sensors with regenerative biology inputs, we empower farmers to grow healthier crops, reduce synthetic pesticide dependence, and monitor environmental conditions with scientific precision.',
        contactPhone: '+1 (800) 555-LEAF',
        contactEmail: 'support@agrileaf.com',
        contactAddress: '786 Olive Branch Blvd, Green Valley, CA 94025'
    }
};

// Database class to read/write state with localStorage
class AgriLeafDB {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(DB_KEY)) {
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
        }
    }

    getData() {
        try {
            return JSON.parse(localStorage.getItem(DB_KEY));
        } catch (e) {
            console.error('Error reading localStorage database, resetting...', e);
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
            return initialData;
        }
    }

    saveData(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }

    // CRUD for Products
    getProducts() {
        return this.getData().products;
    }

    saveProduct(product) {
        const data = this.getData();
        const index = data.products.findIndex(p => p.id === product.id);
        if (index > -1) {
            data.products[index] = product; // Update
        } else {
            product.id = 'p' + (Date.now());
            data.products.push(product); // Create
        }
        this.saveData(data);
        return product;
    }

    deleteProduct(id) {
        const data = this.getData();
        data.products = data.products.filter(p => p.id !== id);
        this.saveData(data);
    }

    // CRUD for Users
    getUsers() {
        return this.getData().users;
    }

    getUserByEmail(email) {
        return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    createUser(user) {
        const data = this.getData();
        const exists = data.users.some(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (exists) return false;
        
        user.role = user.role || 'customer';
        user.createdAt = new Date().toISOString();
        data.users.push(user);
        this.saveData(data);
        return user;
    }

    updateUserRole(email, role) {
        const data = this.getData();
        const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            user.role = role;
            this.saveData(data);
            return true;
        }
        return false;
    }

    deleteUser(email) {
        const data = this.getData();
        // Prevent deleting the main admin to avoid lockouts
        if (email.toLowerCase() === 'admin@agrileaf.com') return false;
        data.users = data.users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
        this.saveData(data);
        return true;
    }

    // CRUD for Orders
    getOrders() {
        return this.getData().orders;
    }

    createOrder(order) {
        const data = this.getData();
        order.id = 'AL-' + Math.floor(1000 + Math.random() * 9000);
        order.date = new Date().toISOString();
        order.status = 'Pending';
        data.orders.unshift(order); // Newest first
        
        // Deduct product stock
        order.items.forEach(item => {
            const product = data.products.find(p => p.id === item.productId);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
            }
        });

        this.saveData(data);
        return order;
    }

    updateOrderStatus(orderId, status) {
        const data = this.getData();
        const order = data.orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            this.saveData(data);
            return true;
        }
        return false;
    }

    // CRUD for Bookings
    getBookings() {
        return this.getData().bookings;
    }

    createBooking(booking) {
        const data = this.getData();
        booking.id = 'B-' + Math.floor(2000 + Math.random() * 8000);
        booking.status = 'Pending';
        data.bookings.unshift(booking);
        this.saveData(data);
        return booking;
    }

    updateBookingStatus(bookingId, status) {
        const data = this.getData();
        const booking = data.bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = status;
            this.saveData(data);
            return true;
        }
        return false;
    }

    // CRUD for Inquiries
    getInquiries() {
        return this.getData().inquiries;
    }

    createInquiry(inquiry) {
        const data = this.getData();
        inquiry.id = 'I-' + Math.floor(3000 + Math.random() * 7000);
        inquiry.date = new Date().toISOString();
        inquiry.status = 'Unread';
        data.inquiries.unshift(inquiry);
        this.saveData(data);
        return inquiry;
    }

    markInquiryRead(inquiryId) {
        const data = this.getData();
        const inquiry = data.inquiries.find(i => i.id === inquiryId);
        if (inquiry) {
            inquiry.status = 'Read';
            this.saveData(data);
            return true;
        }
        return false;
    }

    // CRUD for Content Configuration
    getContent() {
        return this.getData().content;
    }

    updateContent(newContent) {
        const data = this.getData();
        data.content = { ...data.content, ...newContent };
        this.saveData(data);
        return data.content;
    }
}

// Instantiate and attach to window for global access
window.agriDb = new AgriLeafDB();
