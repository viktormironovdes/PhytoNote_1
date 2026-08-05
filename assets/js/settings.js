// ================================================================
// ПРОФИЛЬ И НАСТРОЙКИ
// ================================================================

// Импортируем Capacitor Filesystem (если доступен)
let CapacitorFilesystem = null;
let FileSharer = null;

try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        import('@capacitor/filesystem').then(module => {
            CapacitorFilesystem = module.Filesystem;
            console.log('✅ Capacitor Filesystem loaded');
        }).catch(() => console.log('⚠️ Filesystem not available'));
        
        import('@capgo/capacitor-file-sharer').then(module => {
            FileSharer = module.FileSharer;
            console.log('✅ FileSharer loaded');
        }).catch(() => console.log('⚠️ FileSharer not available'));
    }
} catch (e) {
    console.log('⚠️ Capacitor not available');
}

function saveProfile() {
    const nameInput = document.getElementById('profileNameInput');
    const emailInput = document.getElementById('profileEmailInput');
    
    if (!nameInput || !emailInput) {
        console.error('❌ Profile inputs not found');
        return;
    }
    
    const newName = nameInput.value.trim() || 'Вы';
    const newEmail = emailInput.value.trim();
    
    state.user.name = newName;
    state.user.email = newEmail;
    
    state.user.notifications = {
        push: document.getElementById('notifPush')?.checked ?? true,
        email: document.getElementById('notifEmail')?.checked ?? false,
    };
    
    saveState();
    updateAvatarDisplay();
    alert('✅ Профиль сохранён!');
}

function loadProfile() {
    if (!state.user.name || state.user.name.trim() === '') {
        state.user.name = 'Вы';
        saveState();
    }
    
    document.getElementById('profileNameInput').value = state.user.name || 'Вы';
    document.getElementById('profileEmailInput').value = state.user.email || '';
    document.getElementById('notifPush').checked = state.user.notifications?.push ?? true;
    document.getElementById('notifEmail').checked = state.user.notifications?.email ?? false;
    updateAvatarDisplay();
}

function updateAvatarDisplay() {
    const letterEl = document.getElementById('avatarLetter');
    const imgEl = document.getElementById('avatarImage');
    
    if (!letterEl || !imgEl) return;
    
    if (state.user.avatar) {
        letterEl.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = state.user.avatar;
    } else {
        letterEl.style.display = 'block';
        imgEl.style.display = 'none';
        const name = state.user.name || 'Вы';
        letterEl.textContent = name.charAt(0).toUpperCase();
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 200;
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            state.user.avatar = dataUrl;
            saveState();
            updateAvatarDisplay();
            alert('✅ Аватар обновлён!');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function showDisplaySettingsModal() {
    const settings = state.user.display_settings || {};
    document.getElementById('settingsPlacement').checked = settings.show_placement !== undefined ? settings.show_placement : true;
    document.getElementById('settingsCondition').checked = settings.show_condition !== undefined ? settings.show_condition : true;
    document.getElementById('settingsLight').checked = settings.show_light !== undefined ? settings.show_light : true;
    document.getElementById('settingsWatering').checked = settings.show_watering !== undefined ? settings.show_watering : true;
    document.getElementById('settingsFertilizing').checked = settings.show_fertilizing !== undefined ? settings.show_fertilizing : true;
    document.getElementById('settingsLatinName').checked = settings.show_latin_name || false;
    document.getElementById('settingsPlantingDate').checked = settings.show_planting_date || false;
    document.getElementById('settingsFertilizingPeriod').checked = settings.show_fertilizing_period || false;
    document.getElementById('settingsLastRepotting').checked = settings.show_last_repotting || false;
    document.getElementById('settingsNotes').checked = settings.show_notes || false;
    document.getElementById('settingsCareInfo').checked = settings.show_care_info || false;
    document.getElementById('displaySettingsModal').classList.add('show');
}

function closeDisplaySettingsModal() {
    document.getElementById('displaySettingsModal').classList.remove('show');
}

function saveDisplaySettings() {
    state.user.display_settings = {
        show_placement: document.getElementById('settingsPlacement').checked,
        show_condition: document.getElementById('settingsCondition').checked,
        show_light: document.getElementById('settingsLight').checked,
        show_watering: document.getElementById('settingsWatering').checked,
        show_fertilizing: document.getElementById('settingsFertilizing').checked,
        show_latin_name: document.getElementById('settingsLatinName').checked,
        show_planting_date: document.getElementById('settingsPlantingDate').checked,
        show_fertilizing_period: document.getElementById('settingsFertilizingPeriod').checked,
        show_last_repotting: document.getElementById('settingsLastRepotting').checked,
        show_notes: document.getElementById('settingsNotes').checked,
        show_care_info: document.getElementById('settingsCareInfo').checked,
    };
    saveState();
    if (state.detailFlowerId) {
        renderDetailPage(state.detailFlowerId);
    }
}

// ================================================================
// ЭКСПОРТ КОЛЛЕКЦИЙ (С НАТИВНЫМ ДИАЛОГОМ ANDROID)
// ================================================================

function showExportBaseModal() {
    if (state.bases.length === 0) { alert('Нет коллекций для экспорта'); return; }
    const select = document.getElementById('exportBaseSelect');
    select.innerHTML = state.bases.map(b => `<option value="${b.id}">${b.icon} ${getBaseDisplayName(b)}</option>`).join('');
    document.getElementById('exportBaseModal').classList.add('show');
}

function closeExportBaseModal() {
    document.getElementById('exportBaseModal').classList.remove('show');
}

async function executeExportBase() {
    const baseId = document.getElementById('exportBaseSelect').value;
    const base = getBase(baseId);
    if (!base) return;
    const flowers = getFlowersByBase(baseId);
    const data = { base, flowers, exportedAt: new Date().toISOString() };
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `collection_${base.name}_${new Date().toISOString().split('T')[0]}.json`;

    try {
        // === ПРАВИЛЬНЫЙ СПОСОБ: Web Share API с файлом ===
        // Это открывает НАТИВНОЕ ОКНО Android "Сохранить в..."
        if (window.navigator && window.navigator.share) {
            console.log('📱 Используем Web Share API для нативного диалога Android');
            
            // Создаём файл из JSON
            const file = new File([jsonString], fileName, {
                type: 'application/json'
            });
            
            // Открываем нативное окно "Поделиться" Android
            // В Android это окно позволяет выбрать "Сохранить в файлы" или другое приложение
            await window.navigator.share({
                title: 'Экспорт коллекции',
                text: `Коллекция "${base.name}" (${flowers.length} растений)`,
                files: [file]
            });
            
            console.log('✅ Диалог Android открыт');
            alert(`✅ Коллекция экспортирована!`);
        } 
        // === ЗАПАСНОЙ СПОСОБ: FileSharer.share() ===
        else if (FileSharer && window.Capacitor && window.Capacitor.isNativePlatform()) {
            console.log('📱 Используем FileSharer.share() как запасной вариант');
            
            const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
            
            await FileSharer.share({
                filename: fileName,
                contentType: 'application/json',
                base64Data: base64Data,
                title: 'Экспорт коллекции',
                text: `Коллекция "${base.name}" (${flowers.length} растений)`
            });
            
            alert(`✅ Коллекция экспортирована!`);
        }
        // === БРАУЗЕРНОЕ СКАЧИВАНИЕ (ПК) ===
        else {
            console.log('💻 Используем браузерное скачивание');
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            alert(`✅ Коллекция экспортирована!\n📄 Файл: ${fileName}`);
        }
    } catch (error) {
        console.error('❌ Ошибка экспорта:', error);
        
        // Если пользователь отменил диалог
        if (error.message && (error.message.includes('cancel') || error.message.includes('USER_CANCELLED'))) {
            console.log('ℹ️ Пользователь отменил диалог');
            return;
        }
        
        alert(`❌ Ошибка при экспорте: ${error.message || error}`);
    }
    
    closeExportBaseModal();
}

function importBase(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.base || !data.flowers) { alert('Неверный формат'); return; }
            if (state.bases.some(b => b.name === data.base.name && b.owner === 'Вы')) {
                if (!confirm(`Коллекция "${data.base.name}" уже существует. Создать копию?`)) return;
                data.base.name = data.base.name + ' (копия)';
            }
            const newBaseId = 'base_' + generateUUID();
            data.base.id = newBaseId;
            data.base.owner = 'Вы';
            state.bases.push(data.base);
            data.flowers.forEach(f => {
                const newId = 'flower_' + generateUUID();
                f.id = newId;
                f.base_id = newBaseId;
                if (!f.latin_name) f.latin_name = '';
                if (!f.planting_date) f.planting_date = new Date().toISOString().slice(0, 7);
                if (!f.fertilizing_start) f.fertilizing_start = 3;
                if (!f.fertilizing_end) f.fertilizing_end = 10;
                if (!f.catalog_name) f.catalog_name = f.name;
                if (!f.catalog_icon) f.catalog_icon = '🌿';
                if (!f.catalog_description) f.catalog_description = '';
                if (!f.history) f.history = [];
                state.flowers.push(f);
            });
            saveState();
            renderAll();
            renderCare();
            renderCalendar();
            alert('✅ Коллекция импортирована');
        } catch (err) { alert('Ошибка: ' + err.message); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ================================================================
// ЭКСПОРТ/ИМПОРТ ВСЕХ ДАННЫХ
// ================================================================

async function exportAllData() {
    const data = { bases: state.bases, flowers: state.flowers, user: state.user };
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `all_data_${new Date().toISOString().split('T')[0]}.json`;

    try {
        // Web Share API с файлом — открывает нативное окно Android
        if (window.navigator && window.navigator.share) {
            const file = new File([jsonString], fileName, {
                type: 'application/json'
            });
            
            await window.navigator.share({
                title: 'Экспорт всех данных',
                text: `Все данные PhytoNote (${state.flowers.length} растений)`,
                files: [file]
            });
            
            alert(`✅ Все данные экспортированы!`);
        } else if (FileSharer && window.Capacitor && window.Capacitor.isNativePlatform()) {
            const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
            await FileSharer.share({
                filename: fileName,
                contentType: 'application/json',
                base64Data: base64Data,
                title: 'Экспорт всех данных',
                text: `Все данные PhytoNote (${state.flowers.length} растений)`
            });
            alert(`✅ Все данные экспортированы!`);
        } else {
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            alert(`✅ Все данные экспортированы!\n📄 Файл: ${fileName}`);
        }
    } catch (error) {
        if (error.message && (error.message.includes('cancel') || error.message.includes('USER_CANCELLED'))) {
            console.log('ℹ️ Пользователь отменил диалог');
            return;
        }
        alert(`❌ Ошибка при экспорте: ${error.message || error}`);
    }
}

function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.bases && data.flowers) {
                state.bases = data.bases;
                state.flowers = data.flowers;
                state.user = data.user || {
                    name: 'Вы',
                    email: '',
                    avatar: null,
                    notifications: { push: true, email: false },
                    display_settings: {
                        show_placement: true,
                        show_condition: true,
                        show_light: true,
                        show_watering: true,
                        show_fertilizing: true,
                        show_latin_name: false,
                        show_planting_date: false,
                        show_fertilizing_period: false,
                        show_last_repotting: false,
                        show_notes: false,
                        show_care_info: false,
                    }
                };
                saveState();
                renderAll();
                renderCare();
                renderCalendar();
                alert('✅ Данные успешно импортированы!');
            } else {
                alert('❌ Неверный формат файла');
            }
        } catch (err) {
            alert('❌ Ошибка чтения файла: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function getLogs() {
    try {
        const raw = localStorage.getItem('appLogs');
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

async function exportLogs() {
    const logs = getLogs();
    if (logs.length === 0) {
        alert('Логи пусты');
        return;
    }
    const jsonString = JSON.stringify(logs, null, 2);
    const fileName = `phytonote_logs_${new Date().toISOString().split('T')[0]}.json`;

    try {
        if (window.navigator && window.navigator.share) {
            const file = new File([jsonString], fileName, {
                type: 'application/json'
            });
            
            await window.navigator.share({
                title: 'Экспорт логов',
                text: 'Логи PhytoNote',
                files: [file]
            });
            
            alert(`✅ Логи экспортированы!`);
        } else if (FileSharer && window.Capacitor && window.Capacitor.isNativePlatform()) {
            const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
            await FileSharer.share({
                filename: fileName,
                contentType: 'application/json',
                base64Data: base64Data,
                title: 'Экспорт логов',
                text: 'Логи PhytoNote'
            });
            alert(`✅ Логи экспортированы!`);
        } else {
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            alert(`✅ Логи экспортированы!\n📄 Файл: ${fileName}`);
        }
    } catch (error) {
        if (error.message && (error.message.includes('cancel') || error.message.includes('USER_CANCELLED'))) {
            console.log('ℹ️ Пользователь отменил диалог');
            return;
        }
        alert(`❌ Ошибка при экспорте: ${error.message || error}`);
    }
}
