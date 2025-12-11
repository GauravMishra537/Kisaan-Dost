// main.js (drop-in replacement)
// Handles header, login, signup (with address/bank/security), forgot flow, modals
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = ''; // same origin; set to 'http://localhost:5000' if needed

  // --- state from localStorage ---
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('kisaanDostUser')); } catch (e) { stored = null; }

  // --- element helpers ---
  const el = (id) => document.getElementById(id);
  const qAll = (sel) => Array.from(document.querySelectorAll(sel));

  // header / auth elements
  const authLinks = el('auth-links');
  const userLinks = el('user-links');
  const desktopCartLink = el('desktop-cart-link');
  const authLinksMobile = el('auth-links-mobile');
  const userLinksMobile = el('user-links-mobile');
  const cartLinkMobile = el('cart-link-mobile');
  const desktopLogoutLink = el('desktop-logout-link');
  const logoutButtonMobile = el('logout-button-mobile');

  // modals
  const backdrop = el('modal-backdrop');
  const loginModal = el('login-modal');
  const signupModal = el('signup-modal');
  const forgotModal = el('forgot-modal');

  // modal buttons
  const loginButton = el('login-button');
  const signupButton = el('signup-button');
  const loginButtonMobile = el('login-button-mobile');
  const signupButtonMobile = el('signup-button-mobile');
  const loginCloseButton = el('login-close-button');
  const signupCloseButton = el('signup-close-button');
  const forgotCloseButton = el('forgot-close');
  const openLoginFromSignup = el('open-login-from-signup');

  // mobile menu
  const menuButton = el('mobile-menu-button');
  const mobileMenu = el('mobile-menu');

  // signup specific controls
  const signupUserType = el('signup-user-type');
  const bankSection = el('bank-section');
  const farmSection = el('farm-section');

  // small helper to show/hide
  const show = (node) => node && node.classList.remove('hidden');
  const hide = (node) => node && node.classList.add('hidden');

  // ===== header visibility based on login state =====
  const handleLogout = () => {
    localStorage.removeItem('kisaanDostUser');
    alert('Logged out');
    window.location.reload();
  };

  if (stored) {
    authLinks?.classList.add('hidden');
    userLinks?.classList.remove('hidden');
    desktopCartLink?.classList.remove('hidden');
    if (cartLinkMobile) cartLinkMobile.classList.remove('hidden');
    authLinksMobile && (authLinksMobile.style.display = 'none');
    userLinksMobile?.classList.remove('hidden');

    desktopLogoutLink?.addEventListener('click', handleLogout);
    logoutButtonMobile?.addEventListener('click', handleLogout);
  } else {
    authLinks?.classList.remove('hidden');
    userLinks?.classList.add('hidden');
    desktopCartLink?.classList.add('hidden');
    cartLinkMobile && cartLinkMobile.classList.add('hidden');
    authLinksMobile && (authLinksMobile.style.display = 'flex');
    userLinksMobile?.classList.add('hidden');
  }

  // ===== menu & dropdown toggles =====
  qAll('[href="#forgot"]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); closeModals(); openForgotModal(); }));

  if (menuButton && mobileMenu) menuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

  // ===== modals helpers =====
  const openLoginModal = () => { loginModal?.classList.remove('hidden'); backdrop?.classList.remove('hidden'); };
  const openSignupModal = () => { signupModal?.classList.remove('hidden'); backdrop?.classList.remove('hidden'); };
  const openForgotModal = () => { forgotModal?.classList.remove('hidden'); backdrop?.classList.remove('hidden'); };
  const closeModals = () => { [loginModal, signupModal, forgotModal].forEach(m => m?.classList.add('hidden')); backdrop?.classList.add('hidden'); };

  [loginButton, loginButtonMobile].forEach(b => b?.addEventListener('click', openLoginModal));
  [signupButton, signupButtonMobile].forEach(b => b?.addEventListener('click', openSignupModal));

  [loginCloseButton, signupCloseButton, forgotCloseButton].forEach(b => b?.addEventListener('click', closeModals));
  backdrop?.addEventListener('click', closeModals);
  openLoginFromSignup?.addEventListener('click', (e) => { e.preventDefault(); closeModals(); openLoginModal(); });

  // ===== signup bank toggle =====
  const toggleBankAndFarm = () => {
    const val = signupUserType?.value;
    if (val === 'Farmer') { show(bankSection); show(farmSection); } else { hide(bankSection); hide(farmSection); }
  };
  signupUserType?.addEventListener('change', toggleBankAndFarm);
  toggleBankAndFarm();

  // ===== LOGIN flow =====
  const loginForm = document.querySelector('#login-modal form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('email')?.value?.trim();
    const password = el('password')?.value;
    if (!email || !password) return alert('Enter email and password');

    try {
      const res = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        localStorage.setItem('kisaanDostUser', JSON.stringify(data));
        alert('Login successful');
        closeModals();
        window.location.reload();
      } else {
        alert(data?.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error logging in');
    }
  });

  // ===== SIGNUP flow (send structured address, bank, security) =====
  const signupForm = el('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = el('signup-name')?.value?.trim();
      const email = el('signup-email')?.value?.trim();
      const password = el('signup-password')?.value;
      const mobileNo = el('signup-mobile')?.value;
      const userType = el('signup-user-type')?.value;
      const farmName = el('farm-name')?.value;

      const structuredAddress = {
        line1: el('signup-address1')?.value,
        line2: el('signup-address2')?.value,
        city: el('signup-city')?.value,
        state: el('signup-state')?.value,
        pincode: el('signup-pincode')?.value,
        country: el('signup-country')?.value || 'India',
      };

      const bankDetails = {
        accountName: el('bank-account-name')?.value,
        accountNumber: el('bank-account-number')?.value,
        ifsc: el('bank-ifsc')?.value,
        bankName: el('bank-name')?.value,
        upi: el('bank-upi')?.value,
      };

      const securityQuestion = el('signup-security-question-select')?.value;
      const securityAnswer = el('signup-security-answer')?.value;

      if (!name || !email || !password) return alert('Fill name, email, password');
      if (!structuredAddress.line1 || !structuredAddress.city || !structuredAddress.state || !structuredAddress.pincode)
        return alert('Please fill complete address');

      if (userType === 'Farmer' && (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifsc))
        return alert('Farmers must provide bank details');

      const payload = {
        name, email, password, userType, mobileNo, farmName,
        structuredAddress,
        bankDetails: userType === 'Farmer' ? bankDetails : undefined,
        securityQuestion,
        securityAnswer,
      };

      try {
        const res = await fetch(API_BASE + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          // register returns token and basic user info
          localStorage.setItem('kisaanDostUser', JSON.stringify(data));
          alert('Registration successful');
          closeModals();
          // stay on home (no redirect to farmer dashboard)
          window.location.href = 'index.html';
        } else {
          alert(data?.message || 'Registration failed');
        }
      } catch (err) {
        console.error('Signup error', err);
        alert('Error registering');
      }
    });
  }
  if (user.isAdmin) {
    document.getElementById("admin-portal-link")?.classList.remove("hidden");
}


  // ===== FORGOT flow =====
  const fpEmailInput = el('fp-email');
  const fpEmailSubmit = el('fp-email-submit');
  const fpStepEmail = el('fp-step-email');
  const fpStepQuestion = el('fp-step-question');
  const fpQuestionText = el('fp-question-text');
  const fpAnswer = el('fp-answer');
  const fpNewPassword = el('fp-new-password');
  const fpResetSubmit = el('fp-reset-submit');
  const fpMessage = el('fp-message');

  fpEmailSubmit?.addEventListener('click', async () => {
    const email = fpEmailInput?.value?.trim();
    if (!email) return alert('Enter email');

    try {
      const res = await fetch(API_BASE + '/api/auth/forgot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.question) {
        fpQuestionText.textContent = body.question;
        hide(fpStepEmail); show(fpStepQuestion);
      } else {
        const msg = body?.message || 'If an account exists, a security question will appear.';
        alert(msg);
        if (fpMessage) { fpMessage.textContent = msg; fpMessage.classList.remove('hidden'); }
      }
    } catch (err) {
      console.error('Forgot error', err); alert('Error contacting server');
    }
  });

  fpResetSubmit?.addEventListener('click', async () => {
    const email = fpEmailInput?.value?.trim();
    const answer = fpAnswer?.value?.trim();
    const newPassword = fpNewPassword?.value;
    if (!answer || !newPassword) return alert('Provide answer and new password');

    try {
      const res1 = await fetch(API_BASE + '/api/auth/verify-security', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answer }),
      });
      const body1 = await res1.json().catch(() => null);
      if (!res1.ok) return alert(body1?.message || 'Answer incorrect');

      const resetToken = body1.resetToken;
      if (!resetToken) return alert('No reset token returned');

      const res2 = await fetch(API_BASE + '/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const body2 = await res2.json().catch(() => null);
      if (res2.ok) {
        alert(body2?.message || 'Password reset successful');
        closeModals(); openLoginModal();
      } else alert(body2?.message || 'Password reset failed');
    } catch (err) { console.error(err); alert('Error resetting password'); }
  });
});
// ===== PROFILE DROPDOWN LOGIC =====
const profileMenuBtn = document.getElementById('profile-menu-button');
const profileMenu = document.getElementById('profile-menu');
const adminWrapper = document.getElementById('admin-link-wrapper'); // wrapper div for admin link
const adminPortalLink = document.getElementById('admin-portal-link'); // actual Admin link

if (profileMenuBtn && profileMenu) {
  profileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('hidden');
  });

  // Close dropdown if you click outside
  document.addEventListener('click', (e) => {
    if (!profileMenu.contains(e.target) && !profileMenuBtn.contains(e.target)) {
      profileMenu.classList.add('hidden');
    }
  });
}

// ===== SHOW ADMIN PORTAL IF USER IS ADMIN =====
try {
  const storedUser = localStorage.getItem('kisaanDostUser');
  if (storedUser) {
    const user = JSON.parse(storedUser);

    // Check if user is admin
    const isAdmin = !!user.isAdmin || user.userType === 'Admin' || user.role === 'admin';
    if (isAdmin && adminWrapper) {
      adminWrapper.classList.remove('hidden');
    } else if (adminWrapper) {
      adminWrapper.classList.add('hidden');
    }
  } else if (adminWrapper) {
    adminWrapper.classList.add('hidden');
  }
} catch (err) {
  console.error('Error checking admin role:', err);
  if (adminWrapper) adminWrapper.classList.add('hidden');
}
