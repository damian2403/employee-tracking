// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBkUeSPq0Wb4QjHDIUGzeE4LxHUYUarRrM",
    authDomain: "employeetracking-a71f0.firebaseapp.com",
    databaseURL: "https://employeetracking-a71f0-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "employeetracking-a71f0",
    storageBucket: "employeetracking-a71f0.appspot.com",
    messagingSenderId: "214728548636",
    appId: "1:214728548636:web:bfeb91a11c2dfc9c8e5b6e"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Funkcja do formatowania czasu
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function addEmployee() {
    const name = document.getElementById('employeeName').value.trim();
    const barcode = document.getElementById('employeeBarcode').value.trim();

    console.log("Próba dodania pracownika:", name, barcode);

    if (!name || !barcode) {
        alert("Proszę wprowadzić imię i nazwisko oraz kod EAN pracownika!");
        return;
    }

    firebase.database().ref('employees/' + barcode).set({
        name: name,
        times: []
    }, (error) => {
        if (error) {
            console.error("Błąd podczas dodawania pracownika:", error);
            alert("Błąd podczas dodawania pracownika: " + error);
        } else {
            console.log("Pracownik dodany pomyślnie:", name, barcode);
            displayEmployees();
            document.getElementById('employeeName').value = '';
            document.getElementById('employeeBarcode').value = '';
        }
    });
}

function registerTime() {
    const barcode = document.getElementById('barcodeInput').value.trim();
    if (!barcode) {
        alert('Proszę wprowadzić kod EAN!');
        return;
    }
    const employeeRef = firebase.database().ref('employees/' + barcode);
    employeeRef.once('value').then((snapshot) => {
        const employee = snapshot.val();
        if (!employee) {
            alert('Pracownik o podanym kodzie EAN nie istnieje!');
            return;
        }
        const currentTime = new Date();
        const times = employee.times || [];
        if (times.length && !times[times.length - 1].out) {
            times[times.length - 1].out = currentTime.toISOString();
        } else {
            times.push({ in: currentTime.toISOString() });
        }
        employeeRef.update({ times: times }, (error) => {
            if (error) {
                console.error("Błąd podczas rejestrowania czasu:", error);
                alert("Błąd podczas rejestrowania czasu: " + error);
            } else {
                console.log("Zarejestrowano czas:", times);
                displayEmployees();
                document.getElementById('barcodeInput').value = '';
            }
        });
    });
}

function displayEmployees() {
    const list = document.getElementById('employeesList');
    list.innerHTML = '<table><thead><tr><th>Imię i nazwisko</th><th>Kod EAN</th><th>Akcje</th></tr></thead><tbody></tbody></table>';
    const tbody = list.querySelector('tbody');

    firebase.database().ref('employees').once('value').then((snapshot) => {
        const employees = snapshot.val();
        if (!employees) {
            console.log("Brak pracowników w bazie.");
            return;
        }
        Object.keys(employees).forEach(barcode => {
            const employee = employees[barcode];
            const row = document.createElement('tr');
            row.innerHTML = `<td>${employee.name}</td><td>${barcode}</td>
                             <td>
                                <button onclick="viewEmployee('${barcode}')">Pokaż szczegóły</button>
                                <button class="remove-btn" onclick="removeEmployee('${barcode}')">X</button>
                             </td>`;
            tbody.appendChild(row);
        });
        console.log("Aktualna lista pracowników:", employees);
    });
}

function viewEmployee(barcode) {
    const employeeRef = firebase.database().ref('employees/' + barcode);
    employeeRef.once('value').then((snapshot) => {
        const employee = snapshot.val();
        if (!employee) return;

        document.getElementById('employeeDetails').style.display = 'block';
        document.getElementById('employeeInfo').innerHTML = `<h3>${employee.name} (Kod: ${barcode})</h3>`;

        const tbody = document.getElementById('workTimesTable').querySelector('tbody');
        tbody.innerHTML = '';

        let totalDuration = 0;

        employee.times.forEach((time, index) => {
            const inTime = new Date(time.in);
            const outTime = time.out ? new Date(time.out) : null;
            const duration = outTime ? (outTime - inTime) : null;
            if (duration) totalDuration += duration;

            const formattedDuration = duration ? formatDuration(duration) : 'Praca trwa...';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${inTime.toLocaleDateString('pl-PL', { weekday: 'long' })}</td>
                <td>${inTime.toLocaleDateString('pl-PL')}</td>
                <td><input type="text" value="${inTime.toLocaleTimeString('pl-PL')}" onchange="updateInTime('${barcode}', ${index}, this.value)"></td>
                <td>${outTime ? `<input type="text" value="${outTime.toLocaleTimeString('pl-PL')}" onchange="updateOutTime('${barcode}', ${index}, this.value)">` : 'Praca trwa...'}</td>
                <td>${formattedDuration}</td>
                <td><button class="delete-btn" onclick="deleteEntry('${barcode}', ${index})">Usuń</button></td>
            `;
            tbody.appendChild(row);
        });

        const formattedTotalDuration = formatDuration(totalDuration);
        document.getElementById('employeeInfo').innerHTML += `<h4>Łączny czas pracy: ${formattedTotalDuration}</h4>`;

        console.log("Wyświetlono szczegóły dla:", employee);
    });
}

function updateInTime(barcode, index, newValue) {
    const employeeRef = firebase.database().ref('employees/' + barcode);
    employeeRef.once('value').then((snapshot) => {
        const employee = snapshot.val();
        if (!employee) return;

        const timeEntry = employee.times[index];
        if (!timeEntry) return;

        const [hours, minutes] = newValue.split(':');
        const newInTime = new Date(timeEntry.in);
        newInTime.setHours(hours, minutes);

        timeEntry.in = newInTime.toISOString();
        employeeRef.update({ times: employee.times }, (error) => {
            if (error) {
                console.error("Błąd podczas aktualizacji czasu przyjścia:", error);
                alert("Błąd podczas aktualizacji czasu przyjścia: " + error);
            } else {
                viewEmployee(barcode);
                console.log("Zaktualizowano czas przyjścia:", timeEntry);
            }
        });
    });
}

function updateOutTime(barcode, index, newValue) {
    const employeeRef = firebase.database().ref('employees/' + barcode);
    employeeRef.once('value').then((snapshot) => {
        const employee = snapshot.val();
        if (!employee) return;

        const timeEntry = employee.times[index];
        if (!timeEntry) return;

        const [hours, minutes] = newValue.split(':');
        const newOutTime = new Date(timeEntry.out);
        newOutTime.setHours(hours, minutes);

        timeEntry.out = newOutTime.toISOString();
        employeeRef.update({ times: employee.times }, (error) => {
            if (error) {
                console.error("Błąd podczas aktualizacji czasu wyjścia:", error);
                alert("Błąd podczas aktualizacji czasu wyjścia: " + error);
            } else {
                viewEmployee(barcode);
                console.log("Zaktualizowano czas wyjścia:", timeEntry);
            }
        });
    });
}

function deleteEntry(barcode, index) {
    const employeeRef = firebase.database().ref('employees/' + barcode);
    employeeRef.once('value').then((snapshot) => {
        const employee = snapshot.val();
        if (!employee) return;

        employee.times.splice(index, 1);
        employeeRef.update({ times: employee.times }, (error) => {
            if (error) {
                console.error("Błąd podczas usuwania wpisu czasu:", error);
                alert("Błąd podczas usuwania wpisu czasu: " + error);
            } else {
                viewEmployee(barcode);
                console.log("Usunięto wpis czasu:", employee.times);
            }
        });
    });
}

function removeEmployee(barcode) {
    if (confirm(`Czy na pewno chcesz usunąć pracownika ${barcode}?`)) {
        firebase.database().ref('employees/' + barcode).remove((error) => {
            if (error) {
                console.error("Błąd podczas usuwania pracownika:", error);
                alert("Błąd podczas usuwania pracownika: " + error);
            } else {
                displayEmployees();
                console.log("Usunięto pracownika:", barcode);
            }
        });
    }
}

function closeDetails() {
    document.getElementById('employeeDetails').style.display = 'none';
    console.log("Zamknięto szczegóły pracownika.");
}

window.onload = displayEmployees;

