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

    // Language toggle and IP detection
    const langToggles = document.querySelectorAll('.langToggle');
    
    function setLanguage(lang) {
        document.body.setAttribute('data-lang', lang);
        document.documentElement.lang = lang;
        langToggles.forEach(btn => {
            btn.textContent = lang === 'no' ? 'EN' : 'NO';
        });
        localStorage.setItem('preferredLang', lang);
    }

    langToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentLang = document.body.getAttribute('data-lang');
            setLanguage(currentLang === 'no' ? 'en' : 'no');
        });
    });

    // Initialize language
    async function initLanguage() {
        const savedLang = localStorage.getItem('preferredLang');
        if (savedLang) {
            setLanguage(savedLang);
            return;
        }

        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                if (data.country_code === 'NO') {
                    setLanguage('no');
                } else {
                    setLanguage('en');
                }
            } else {
                // Fallback to English if API fails
                setLanguage('en');
            }
        } catch (error) {
            console.error('Error fetching IP data:', error);
            // Fallback to English if network error
            setLanguage('en');
        }
    }

    initLanguage();
});

// --- RSVP & Supabase Logic ---
const SUPABASE_URL = 'https://wqtbotfqxdaeujiwvorh.supabase.co';
const SUPABASE_KEY = 'sb_publishable__Uzxsen_TzgQLRvd4s5MFg_AzRtLAWK';

// Mock data as fallback
let guests = [
    { id: 1, first_name: "Espen", last_name: "Erlingsen", household_id: 1, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 2, first_name: "Sonya", last_name: "Erlingsen", household_id: 1, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 3, first_name: "Ola", last_name: "Nordmann", household_id: 2, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 4, first_name: "Kari", last_name: "Nordmann", household_id: 2, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" },
    { id: 5, first_name: "Enslig", last_name: "Gjest", household_id: 3, has_responded: false, attending_friday: false, attending_saturday: false, attending_sunday: false, dietary: "" }
];

let supabaseClient = null;
if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Skalerer ned og konverterer gjestebilder til JPEG før opplasting.
// Sikrer at formater som HEIC (iPhone) ikke havner i treet som filer
// nettlesere ikke kan vise, og holder filstørrelsen nede.
function resizeImageToJpeg(file, maxSize = 800, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Kunne ikke konvertere bildet')),
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Nettleseren kunne ikke lese bildeformatet'));
        };
        img.src = url;
    });
}

async function loadGuests() {
    if (supabaseClient) {
        // Hent kun kolonnene frontend trenger – aldri e-post eller diettinfo
        const { data, error } = await supabaseClient.from('guests').select(
            'id, first_name, last_name, household_id, side, relationship, has_responded, attending_friday, attending_saturday, attending_sunday, photo_url'
        );
        if (error) {
            console.error("Supabase Error:", error);
        }
        if (data && data.length > 0) {
            guests = data;
            renderWeddingTree();
        }
    }
}

// PRNG for consistent tree spots
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const rng = mulberry32(42); // Fixed seed for consistent layout
const leftSpots = [];
const rightSpots = [];
const centerSpots = [];
for (let i = 0; i < 600; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    const xRadius = 42; 
    const yRadius = 38; 
    const x = 50 + Math.cos(angle) * r * xRadius;
    const y = 38 + Math.sin(angle) * r * yRadius;
    
    // Avoid trunk
    if (y > 65 && x > 40 && x < 60) continue;
    
    if (x < 47 && leftSpots.length < 40) leftSpots.push({ top: y, left: x });
    else if (x > 53 && rightSpots.length < 40) rightSpots.push({ top: y, left: x });
    else if (x >= 47 && x <= 53 && centerSpots.length < 40) centerSpots.push({ top: y, left: x });
    
    if (leftSpots.length >= 40 && rightSpots.length >= 40 && centerSpots.length >= 40) break;
}

function renderWeddingTree() {
    const container = document.getElementById('treeLeaves');
    if (!container || !guests) return;
    container.innerHTML = '';
    
    const attendees = guests.filter(g => 
        g.has_responded && (g.attending_friday || g.attending_saturday || g.attending_sunday)
    );
    
    // Group by household
    const households = {};
    attendees.forEach(g => {
        const hId = g.household_id;
        if (!households[hId]) households[hId] = [];
        households[hId].push(g);
    });

    let leftIndex = 0;
    let rightIndex = 0;
    let centerIndex = 0;
    
    Object.values(households).forEach(householdGuests => {
        const firstGuest = householdGuests[0];
        const side = firstGuest.side ? firstGuest.side.toLowerCase().trim() : '';
        
        let baseSpot;
        if (side === 'sonya') {
            if (leftIndex >= leftSpots.length) return;
            baseSpot = leftSpots[leftIndex++];
        } else if (side === 'espen') {
            if (rightIndex >= rightSpots.length) return;
            baseSpot = rightSpots[rightIndex++];
        } else {
            if (centerIndex >= centerSpots.length) return;
            baseSpot = centerSpots[centerIndex++];
        }
        
        householdGuests.forEach((guest, i) => {
            const leaf = document.createElement('div');
            leaf.className = 'guest-leaf';
            
            // Offset logic for household members
            const xOffset = i === 0 ? 0 : (i === 1 ? 5 : (i === 2 ? -4 : (i === 3 ? 2 : -2)));
            const yOffset = i === 0 ? 0 : (i === 1 ? 3 : (i === 2 ? 4 : (i === 3 ? -5 : -3)));
            
            leaf.style.top = (baseSpot.top + yOffset) + '%';
            leaf.style.left = (baseSpot.left + xOffset) + '%';
            leaf.style.animationDelay = (rng() * 1.5) + 's';
            leaf.title = `${guest.first_name} ${guest.last_name}`;
            
            if (guest.photo_url) {
                const img = document.createElement('img');
                img.src = guest.photo_url;
                img.alt = guest.first_name;
                leaf.appendChild(img);
            } else {
                const initial = document.createElement('span');
                initial.className = 'initial';
                initial.textContent = guest.first_name.charAt(0).toUpperCase() + (guest.last_name ? guest.last_name.charAt(0).toUpperCase() : '');
                leaf.appendChild(initial);
            }
            
            leaf.addEventListener('click', () => {
                const modal = document.getElementById('guestProfileModal');
                const imgContainer = document.getElementById('guestProfileImageContainer');
                const nameEl = document.getElementById('guestProfileName');
                const relationEl = document.getElementById('guestProfileRelation');
                
                imgContainer.innerHTML = leaf.innerHTML;
                nameEl.textContent = `${guest.first_name} ${guest.last_name}`;
                relationEl.textContent = guest.relationship || '';
                
                modal.classList.add('active');
            });
            
            container.appendChild(leaf);
        });
    });
}
loadGuests();

document.addEventListener('DOMContentLoaded', () => {
    const guestSearch = document.getElementById('guestSearch');
    const guestList = document.getElementById('guestList');
    const rsvpModal = document.getElementById('rsvpModal');
    const householdModal = document.getElementById('householdModal');
    const guestProfileModal = document.getElementById('guestProfileModal');
    const toursModal = document.getElementById('toursModal');
    const dressCodeModal = document.getElementById('dressCodeModal');
    const closeRsvpModal = document.getElementById('closeRsvpModal');
    const closeGuestProfileModal = document.getElementById('closeGuestProfileModal');
    const closeHouseholdModal = document.getElementById('closeHouseholdModal');
    const closeToursModal = document.getElementById('closeToursModal');
    const closeDressCodeModal = document.getElementById('closeDressCodeModal');
    const openToursModals = document.querySelectorAll('.openToursModal');
    const openDressCodeModals = document.querySelectorAll('.openDressCodeModal');
    const rsvpForm = document.getElementById('singleRsvpForm');
    const rsvpModalNameNo = document.getElementById('rsvpModalNameNo');
    const rsvpModalNameEn = document.getElementById('rsvpModalNameEn');
    const guestIdInput = document.getElementById('guestId');
    const dietaryInput = document.getElementById('dietary');
    const skipHouseholdBtn = document.getElementById('skipHouseholdBtn');
    const householdListUl = document.getElementById('householdList');

    let currentGuest = null;

    // Forhåndsvisning av gjestebilde i RSVP-skjemaet. Viser eksisterende
    // bilde (eller nyvalgt fil), og bytter knappetekst til "Endre bilde".
    const photoUploadRow = document.getElementById('photoUploadRow');
    const photoPreview = document.getElementById('photoPreview');
    const guestPhotoInput = document.getElementById('guestPhoto');
    let photoObjectUrl = null;

    function updatePhotoPreview(src) {
        if (!photoUploadRow || !photoPreview) return;
        if (photoObjectUrl) {
            URL.revokeObjectURL(photoObjectUrl);
            photoObjectUrl = null;
        }
        photoPreview.innerHTML = '';
        if (src) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = '';
            photoPreview.appendChild(img);
            photoUploadRow.classList.add('has-photo');
        } else {
            photoUploadRow.classList.remove('has-photo');
        }
    }

    guestPhotoInput?.addEventListener('change', () => {
        if (guestPhotoInput.files.length > 0) {
            photoObjectUrl = URL.createObjectURL(guestPhotoInput.files[0]);
            const img = document.createElement('img');
            img.src = photoObjectUrl;
            img.alt = '';
            photoPreview.innerHTML = '';
            photoPreview.appendChild(img);
            photoUploadRow.classList.add('has-photo');
        } else {
            updatePhotoPreview(currentGuest ? currentGuest.photo_url : null);
        }
    });

    // Stilet takkebekreftelse (erstatter alert). Lukkes automatisk,
    // eller med Escape/klikk utenfor som de andre modalene.
    const thanksModal = document.getElementById('thanksModal');
    let thanksTimer = null;
    function showThanksConfirmation() {
        if (!thanksModal) return;
        thanksModal.classList.add('active');
        clearTimeout(thanksTimer);
        thanksTimer = setTimeout(() => thanksModal.classList.remove('active'), 3500);
    }

    if (guestSearch) {
        guestSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            guestList.innerHTML = '';
            
            if (term.length < 2) {
                guestList.classList.remove('active');
                return;
            }

            const filtered = guests.filter(g => (g.first_name + ' ' + g.last_name).toLowerCase().includes(term));
            
            if (filtered.length > 0) {
                guestList.classList.add('active');
                filtered.forEach(g => {
                    const li = document.createElement('li');
                    const fullName = `${g.first_name} ${g.last_name}`;
                    if (g.has_responded) {
                        li.innerHTML = `<span class="lang-no">${fullName} ✓ (Svart)</span><span class="lang-en">${fullName} ✓ (RSVP'd)</span>`;
                    } else {
                        li.textContent = fullName;
                    }
                    
                    li.addEventListener('click', () => {
                        guestSearch.value = fullName;
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

    window.openRsvpModal = function openRsvpModal(guest) {
        currentGuest = guest;
        guestIdInput.value = guest.id;
        const fullName = `${guest.first_name} ${guest.last_name}`;
        rsvpModalNameNo.textContent = `Svar for ${fullName}`;
        rsvpModalNameEn.textContent = `RSVP for ${fullName}`;
        
        rsvpForm.reset();
        updatePhotoPreview(guest.photo_url || null);

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
            if (rsvpEmailInput) {
                rsvpEmailInput.required = !declined;
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

    closeGuestProfileModal?.addEventListener('click', () => {
        guestProfileModal.classList.remove('active');
    });

    openToursModals.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toursModal.classList.add('active');
        });
    });

    closeToursModal?.addEventListener('click', () => {
        toursModal.classList.remove('active');
    });

    openDressCodeModals.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            dressCodeModal.classList.add('active');
        });
    });

    closeDressCodeModal?.addEventListener('click', () => {
        dressCodeModal.classList.remove('active');
    });

    closeHouseholdModal?.addEventListener('click', () => {
        householdModal.classList.remove('active');
    });

    // Lukk modaler med Escape eller klikk utenfor innholdet
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });

    skipHouseholdBtn?.addEventListener('click', () => {
        householdModal.classList.remove('active');
        showThanksConfirmation();
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
            
            let photo_url = currentGuest.photo_url || null;
            const guestPhotoInput = document.getElementById('guestPhoto');
            const submitBtn = rsvpForm.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn.innerHTML;

            if (guestPhotoInput && guestPhotoInput.files.length > 0 && supabaseClient) {
                submitBtn.innerHTML = '<span class="lang-no">Laster opp...</span><span class="lang-en">Uploading...</span>';
                submitBtn.disabled = true;

                let resizedBlob;
                try {
                    resizedBlob = await resizeImageToJpeg(guestPhotoInput.files[0]);
                } catch (err) {
                    console.error("Feil ved behandling av bilde:", err);
                    alert(document.documentElement.lang === 'no' ? 'Bildeformatet støttes ikke. Prøv et annet bilde (f.eks. JPEG eller PNG).' : 'The image format is not supported. Please try another image (e.g. JPEG or PNG).');
                    submitBtn.innerHTML = originalBtnHtml;
                    submitBtn.disabled = false;
                    return; // Stop form submission if processing fails
                }

                const fileName = `${currentGuest.id}_${Date.now()}.jpg`;
                const { data, error } = await supabaseClient.storage.from('guest_images').upload(fileName, resizedBlob, { contentType: 'image/jpeg' });

                if (error) {
                    console.error("Feil ved bildeopplasting:", error);
                    alert(document.documentElement.lang === 'no' ? 'Klarte ikke laste opp bilde. Prøv igjen uten bilde.' : 'Failed to upload photo. Please try again without photo.');
                    submitBtn.innerHTML = originalBtnHtml;
                    submitBtn.disabled = false;
                    return; // Stop form submission if upload fails
                } else {
                    // Rydd opp: slett det forrige bildet fra lagringen (best effort)
                    const oldUrl = currentGuest.photo_url;
                    if (oldUrl && oldUrl.includes('/guest_images/')) {
                        const oldName = decodeURIComponent(oldUrl.split('/guest_images/')[1].split('?')[0]);
                        supabaseClient.storage.from('guest_images').remove([oldName]).catch(() => {});
                    }

                    const { data: urlData } = supabaseClient.storage.from('guest_images').getPublicUrl(fileName);
                    if (urlData) {
                        photo_url = urlData.publicUrl;
                    }
                }
            }

            currentGuest.has_responded = true;
            currentGuest.email = email;
            currentGuest.attending_friday = attending_friday;
            currentGuest.attending_saturday = attending_saturday;
            currentGuest.attending_sunday = attending_sunday;
            currentGuest.dietary = dietary;
            currentGuest.photo_url = photo_url;
            
            if (supabaseClient) {
                await supabaseClient.from('guests').update({ 
                    has_responded: true, 
                    email: email,
                    attending_friday, 
                    attending_saturday, 
                    attending_sunday, 
                    dietary,
                    photo_url
                }).eq('id', currentGuest.id);
            }
            
            // Re-render tree to show the newly accepted guest immediately
            renderWeddingTree();
            
            if (submitBtn) {
                submitBtn.innerHTML = originalBtnHtml;
                submitBtn.disabled = false;
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
                    <span>${member.first_name} ${member.last_name}</span>
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
            showThanksConfirmation();
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
// --- Digital Invitation Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteId = urlParams.get('invite');
    
    if (inviteId) {
        async function processInvite() {
            // Wait for Supabase to fetch if it hasn't finished
            if (!guests || guests.length <= 5) {
                await loadGuests(); 
            }
            
            const householdId = parseInt(inviteId, 10);
            const invitedGuests = guests.filter(g => g.household_id === householdId);
            
            if (invitedGuests.length > 0) {
                const names = invitedGuests.map(g => g.first_name);
                let formattedNames = '';
                let pronoun = 'dere';
                
                if (names.length === 1) {
                    formattedNames = names[0];
                    pronoun = 'deg';
                } else if (names.length === 2) {
                    formattedNames = `${names[0]} og ${names[1]}`;
                } else {
                    const last = names.pop();
                    formattedNames = `${names.join(', ')} og ${last}`;
                }
                
                const inviteNamesEl = document.getElementById('inviteNames');
                const invitePronounEl = document.getElementById('invitePronoun');
                const inviteOverlay = document.getElementById('inviteOverlay');
                const enterSiteBtn = document.getElementById('enterSiteBtn');
                const inviteRsvpBtn = document.getElementById('inviteRsvpBtn');
                const closeInviteBtn = document.getElementById('closeInviteBtn');
                
                if (inviteNamesEl && invitePronounEl && inviteOverlay && enterSiteBtn) {
                    inviteNamesEl.textContent = formattedNames;
                    invitePronounEl.textContent = pronoun;
                    
                    inviteOverlay.classList.remove('hidden');
                    document.body.style.overflow = 'hidden'; // Stop background scrolling
                    
                    const closeInvite = () => {
                        inviteOverlay.classList.add('hidden');
                        document.body.style.overflow = '';
                        window.history.replaceState({}, document.title, window.location.pathname);
                    };
                    
                    enterSiteBtn.addEventListener('click', closeInvite);
                    if (closeInviteBtn) closeInviteBtn.addEventListener('click', closeInvite);
                    
                    if (inviteRsvpBtn) {
                        inviteRsvpBtn.addEventListener('click', () => {
                            closeInvite();

                            const householdListUl = document.getElementById('householdList');
                            const householdModal = document.getElementById('householdModal');
                            if (householdListUl && householdModal) {
                                householdListUl.innerHTML = '';
                                invitedGuests.forEach(member => {
                                    const li = document.createElement('li');
                                    li.innerHTML = `
                                        <span>${member.first_name} ${member.last_name}</span>
                                        <button class="btn-small ${member.has_responded ? 'answered' : ''}">
                                            <span class="lang-no">${member.has_responded ? 'Endre svar' : 'Svar nå'}</span>
                                            <span class="lang-en">${member.has_responded ? 'Change RSVP' : 'RSVP now'}</span>
                                        </button>
                                    `;
                                    li.querySelector('button').addEventListener('click', () => {
                                        householdModal.classList.remove('active');
                                        if (window.openRsvpModal) window.openRsvpModal(member);
                                    });
                                    householdListUl.appendChild(li);
                                });
                                householdModal.classList.add('active');
                            }
                        });
                    }
                }
            }
        }
        processInvite();
    }
});
