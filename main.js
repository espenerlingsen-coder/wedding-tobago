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
const SUPABASE_URL = 'https://wqtbotfqxdaeujiwvorh.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable__Uzxsen_TzgQLRvd4s5MFg_AzRtLAWK';

// Mock data as fallback
let guests = [
    { id: 1, name: "Espen Erlingsen", household_id: 1, attending: null, dietary: "" },
    { id: 2, name: "Sonya Erlingsen", household_id: 1, attending: null, dietary: "" },
    { id: 3, name: "Ola Nordmann", household_id: 2, attending: null, dietary: "" },
    { id: 4, name: "Kari Nordmann", household_id: 2, attending: null, dietary: "" },
    { id: 5, name: "Enslig Gjest", household_id: 3, attending: null, dietary: "" }
];

let supabaseClient = null;
if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

async function loadGuests() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('guests').select('*');
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
                    li.textContent = g.name;
                    if (g.attending !== null) {
                        li.textContent += " ✓ (Svart)";
                    }
                    
                    let clickTimer = null;
                    li.addEventListener('click', () => {
                        if (clickTimer) {
                            clearTimeout(clickTimer);
                            clickTimer = null;
                            openRsvpModal(g);
                        } else {
                            clickTimer = setTimeout(() => {
                                clickTimer = null;
                                guestSearch.value = g.name;
                                guestList.classList.remove('active');
                            }, 250);
                        }
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
        if (guest.attending !== null) {
            rsvpForm.elements['attending'].value = guest.attending ? 'yes' : 'no';
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
            const attending = rsvpForm.elements['attending'].value === 'yes';
            const dietary = dietaryInput.value;
            
            currentGuest.attending = attending;
            currentGuest.dietary = dietary;
            
            if (supabaseClient) {
                await supabaseClient.from('guests').update({ attending, dietary }).eq('id', currentGuest.id);
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
                    <button class="btn-small ${member.attending !== null ? 'answered' : ''}">
                        ${member.attending !== null ? 'Endre svar' : 'Svar nå'}
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
