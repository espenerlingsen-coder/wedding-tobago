document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.querySelector('.nav-links');
    
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close mobile menu on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // Reveal animations on scroll
    const reveals = document.querySelectorAll('.reveal');

    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const elementVisible = 150;

        reveals.forEach(reveal => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                reveal.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger once on load

    // Language toggle
    const langToggle = document.getElementById('langToggle');
    langToggle.addEventListener('click', () => {
        const currentLang = document.body.getAttribute('data-lang');
        if (currentLang === 'no') {
            document.body.setAttribute('data-lang', 'en');
            langToggle.textContent = 'NO';
            document.documentElement.lang = 'en';
        } else {
            document.body.setAttribute('data-lang', 'no');
            langToggle.textContent = 'EN';
            document.documentElement.lang = 'no';
        }
    });
});

// --- RSVP & Supabase Logic ---
const SUPABASE_URL = 'https://wqtbotfqxdaeujiwvorh.supabase.co';
const SUPABASE_KEY = 'sb_publishable__Uzxsen_TzgQLRvd4s5MFg_AzRtLAWK';

// Mock data as fallback
let guests = [
    { id: 1, name: "Espen Erlingsen", household_id: 1, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 2, name: "Sonya Erlingsen", household_id: 1, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 3, name: "Ola Nordmann", household_id: 2, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 4, name: "Kari Nordmann", household_id: 2, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 5, name: "Enslig Gjest", household_id: 3, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" }
];

let supabaseClient = null;
if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

async function loadGuests() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('guests').select('*');
        if (error) {
            console.error("Supabase Error:", error);
        }
        if (data && data.length > 0) guests = data;
    }
}
loadGuests();

document.addEventListener('DOMContentLoaded', () => {
    const guestSearch = document.getElementById('guestSearch');
    const guestList = document.getElementById('guestList');
    const rsvpModal = document.getElementById('rsvpModal');
    const householdModal = document.getElementById('householdModal');
    const closeRsvpModal = document.getElementById('closeRsvpModal');
    const closeHouseholdModal = document.getElementById('closeHouseholdModal');
    const rsvpForm = document.getElementById('singleRsvpForm');
    const rsvpModalNameNo = document.getElementById('rsvpModalNameNo');
    const rsvpModalNameEn = document.getElementById('rsvpModalNameEn');
    const guestIdInput = document.getElementById('guestId');
    const dietaryInput = document.getElementById('dietary');
    const skipHouseholdBtn = document.getElementById('skipHouseholdBtn');
    const householdListUl = document.getElementById('householdList');

    let currentGuest = null;

    if (guestSearch) {
        guestSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            guestList.innerHTML = '';
            
            if (term.length < 2) {
                guestList.classList.remove('active');
                return;
            }

            const filtered = guests.filter(g => g.name.toLowerCase().includes(term));
            
            if (filtered.length > 0) {
                guestList.classList.add('active');
                filtered.forEach(g => {
                    const li = document.createElement('li');
                    if (g.has_responded) {
                        li.innerHTML = `<span class="lang-no">${g.name} ✓ (Svart)</span><span class="lang-en">${g.name} ✓ (RSVP'd)</span>`;
                    } else {
                        li.textContent = g.name;
                    }
                    
                    li.addEventListener('click', () => {
                        guestSearch.value = g.name;
                        openRsvpModal(g);
                    });

                    guestList.appendChild(li);
                });
            } else {
                guestList.classList.remove('active');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (guestSearch && !guestSearch.contains(e.target) && !guestList.contains(e.target)) {
            guestList.classList.remove('active');
        }
    });

    function openRsvpModal(guest) {
        currentGuest = guest;
        guestIdInput.value = guest.id;
        rsvpModalNameNo.textContent = `Svar for ${guest.name}`;
        rsvpModalNameEn.textContent = `RSVP for ${guest.name}`;
        
        rsvpForm.reset();
        
        const rsvpEmailInput = document.getElementById('rsvpEmail');
        if (rsvpEmailInput) {
            rsvpEmailInput.value = guest.email || localStorage.getItem('rsvp_email') || '';
        }

        const isDeclined = guest.has_responded && !guest.attending_friday && !guest.attending_saturday && !guest.attending_sunday;
        const cannotAttendInput = document.getElementById('cannotAttend');
        const daysGroup = document.getElementById('daysAttendingGroup');
        const dayInputs = rsvpForm.querySelectorAll('input[type="checkbox"]:not(#cannotAttend)');

        function toggleDays(declined) {
            if (daysGroup) {
                daysGroup.style.opacity = declined ? '0.5' : '1';
                daysGroup.style.pointerEvents = declined ? 'none' : 'auto';
            }
            dayInputs.forEach(input => {
                input.disabled = declined;
                if (declined) input.checked = false;
            });
        }

        if (cannotAttendInput) {
            cannotAttendInput.checked = isDeclined;
            toggleDays(isDeclined);
            cannotAttendInput.onchange = (e) => toggleDays(e.target.checked);
        }

        if (!isDeclined) {
            rsvpForm.elements['attending_friday'].checked = guest.attending_friday;
            rsvpForm.elements['attending_saturday'].checked = guest.attending_saturday;
            rsvpForm.elements['attending_sunday'].checked = guest.attending_sunday;
        }
        
        dietaryInput.value = guest.dietary || '';
        
        guestList.classList.remove('active');
        rsvpModal.classList.add('active');
    }

    closeRsvpModal?.addEventListener('click', () => {
        rsvpModal.classList.remove('active');
    });

    closeHouseholdModal?.addEventListener('click', () => {
        householdModal.classList.remove('active');
    });

    skipHouseholdBtn?.addEventListener('click', () => {
        householdModal.classList.remove('active');
        alert(document.documentElement.lang === 'no' ? 'Takk for svaret!' : 'Thank you for your RSVP!');
    });

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const cannotAttendInput = document.getElementById('cannotAttend');
            const isDeclined = cannotAttendInput && cannotAttendInput.checked;
            
            const attending_friday = isDeclined ? false : rsvpForm.elements['attending_friday'].checked;
            const attending_saturday = isDeclined ? false : rsvpForm.elements['attending_saturday'].checked;
            const attending_sunday = isDeclined ? false : rsvpForm.elements['attending_sunday'].checked;
            const dietary = dietaryInput.value;
            
            const rsvpEmailInput = document.getElementById('rsvpEmail');
            const email = rsvpEmailInput ? rsvpEmailInput.value : '';
            if (email) {
                localStorage.setItem('rsvp_email', email);
            }
            
            currentGuest.has_responded = true;
            currentGuest.email = email;
            currentGuest.attending_friday = attending_friday;
            currentGuest.attending_saturday = attending_saturday;
            currentGuest.attending_sunday = attending_sunday;
            currentGuest.dietary = dietary;
            
            if (supabaseClient) {
                await supabaseClient.from('guests').update({ 
                    has_responded: true, 
                    email: email,
                    attending_friday, 
                    attending_saturday, 
                    attending_sunday, 
                    dietary 
                }).eq('id', currentGuest.id);
            }
            
            rsvpModal.classList.remove('active');
            checkHousehold(currentGuest);
        });
    }

    function checkHousehold(guest) {
        const householdMembers = guests.filter(g => g.household_id === guest.household_id && g.id !== guest.id);
        
        if (householdMembers.length > 0) {
            householdListUl.innerHTML = '';
            householdMembers.forEach(member => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${member.name}</span>
                    <button class="btn-small ${member.has_responded ? 'answered' : ''}">
                        <span class="lang-no">${member.has_responded ? 'Endre svar' : 'Svar nå'}</span>
                        <span class="lang-en">${member.has_responded ? 'Change RSVP' : 'RSVP now'}</span>
                    </button>
                `;
                li.querySelector('button').addEventListener('click', () => {
                    householdModal.classList.remove('active');
                    openRsvpModal(member);
                });
                householdListUl.appendChild(li);
            });
            householdModal.classList.add('active');
        } else {
            alert(document.documentElement.lang === 'no' ? 'Takk for svaret!' : 'Thank you for your RSVP!');
        }
    }
});

// --- Countdown Logic ---
const weddingDate = new Date("2027-05-01T16:00:00-04:00").getTime();
const countdownTimer = setInterval(() => {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    if (distance < 0) {
        clearInterval(countdownTimer);
        const els = ['days', 'hours', 'minutes', 'seconds'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = "00";
        });
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const updateEl = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val.toString().padStart(2, '0');
    };
    
    updateEl("days", days);
    updateEl("hours", hours);
    updateEl("minutes", minutes);
    updateEl("seconds", seconds);
}, 1000);

// Carousel navigation
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('carouselContainer');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');

    if (container && prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        
        nextBtn.addEventListener('click', () => {
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }
});
