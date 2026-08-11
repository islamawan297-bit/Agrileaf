# Agrileaf Frontend Integration Guide

This guide provides copy-pasteable JavaScript examples using the native browser `fetch` API to connect your frontend templates/forms with the Agrileaf backend API.

---

## Table of Contents
1. [General Setup (API Base URL & Auth Headers)](#1-general-setup-api-base-url--auth-headers)
2. [Authentication & User Profile](#2-authentication--user-profile)
3. [Crop / Product Catalog](#3-crop--product-catalog)
4. [Inquiry / Contact Form](#4-inquiry--contact-form)
5. [Orders & Booking Checkout](#5-orders--booking-checkout)
6. [Newsletter Subscription](#6-newsletter-subscription)

---

## 1. General Setup (API Base URL & Auth Headers)

Define your backend base URL globally and create a helper function to retrieve the JSON Web Token (JWT) from browser storage.

```javascript
const API_BASE_URL = 'http://localhost:5000/api';

// Retrieve auth headers if token is present
function getAuthHeaders() {
  const token = localStorage.getItem('agrileaf_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
```

---

## 2. Authentication & User Profile

### A. User Registration
For registering farmers, buyers, or admins.

```javascript
async function registerUser(name, email, password, role = 'buyer', phone = '', address = '') {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, phone, address })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Registration failed');
    }

    // Save JWT and user metadata to localStorage
    localStorage.setItem('agrileaf_token', result.token);
    localStorage.setItem('agrileaf_user', JSON.stringify(result));
    
    console.log('Registration Successful:', result);
    return result;
  } catch (error) {
    console.error('Registration Error:', error.message);
    alert(error.message);
  }
}
```

### B. User Login
Authenticates users and stores the generated JWT.

```javascript
async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }

    // Save JWT token and profile details
    localStorage.setItem('agrileaf_token', result.token);
    localStorage.setItem('agrileaf_user', JSON.stringify(result));

    console.log('Login Successful:', result);
    return result;
  } catch (error) {
    console.error('Login Error:', error.message);
    alert(error.message);
  }
}
```

### C. Fetch Current User Profile (Protected Route)
Retrieves the profile details of the currently logged-in user.

```javascript
async function getUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch profile');
    }

    console.log('User Profile:', result.data);
    return result.data;
  } catch (error) {
    console.error('Profile Retrieval Error:', error.message);
  }
}
```

---

## 3. Crop / Product Catalog

### A. Get All Products (With Search, Category Filters, and Pagination)
Query arguments can be optional.

```javascript
async function fetchProducts(filters = {}) {
  const { category = '', search = '', page = 1, limit = 10 } = filters;
  
  // Construct Query String
  const queryParams = new URLSearchParams({
    category,
    search,
    page,
    limit
  }).toString();

  try {
    const response = await fetch(`${API_BASE_URL}/products?${queryParams}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to load products');
    }

    console.log('Products:', result.data);
    console.log('Pagination Metadata:', result.pagination);
    return result;
  } catch (error) {
    console.error('Fetch Products Error:', error.message);
  }
}

// Example usage:
// fetchProducts({ category: 'Organic', search: 'tomato', page: 1 });
```

### B. Add a New Product Listing (Protected - Farmers/Admins only)

```javascript
async function createProduct(productData) {
  // Example productData: { title: 'Fresh Carrots', price: 2.50, unit: 'per kg', category: 'Vegetables', quantityAvailable: 150 }
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create product listing');
    }

    console.log('Product Created:', result.data);
    return result.data;
  } catch (error) {
    console.error('Create Product Error:', error.message);
    alert(error.message);
  }
}
```

---

## 4. Inquiry / Contact Form

### Submit a Contact Form (Sends DB record + Nodemailer confirmation email)

```javascript
async function submitContactForm(name, email, phone, subject, message) {
  try {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, phone, subject, message })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Inquiry submission failed');
    }

    console.log('Inquiry Submitted:', result.message);
    alert('Thank you! Your message has been sent successfully.');
    return result;
  } catch (error) {
    console.error('Contact Form Error:', error.message);
  }
}
```

---

## 5. Orders & Booking Checkout

### Place an Order / Booking Request (Protected)
Submits a list of items and updates stock availability automatically.

```javascript
async function checkoutOrder(cartItems, shippingAddress) {
  // Example cartItems format: [{ product: "PRODUCT_ID_1", quantity: 5 }]
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        items: cartItems,
        shippingAddress
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Checkout failed');
    }

    console.log('Order Booked Successfully:', result.data);
    alert(`Order placed successfully! Total amount: $${result.data.totalAmount}`);
    return result.data;
  } catch (error) {
    console.error('Checkout Error:', error.message);
    alert(error.message);
  }
}
```

---

## 6. Newsletter Subscription

### Subscribe to Newsletter Updates

```javascript
async function subscribeNewsletter(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Subscription failed');
    }

    console.log('Newsletter Subscription:', result.message);
    alert(result.message);
    return result;
  } catch (error) {
    console.error('Newsletter Error:', error.message);
    alert(error.message);
  }
}
```
