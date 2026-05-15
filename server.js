import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-analytics.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDN7yoai_Jtx7Zs_5mvBR373DsvZN_4DSM",
    authDomain: "gatherjs-server.firebaseapp.com",
    projectId: "gatherjs-server",
    storageBucket: "gatherjs-server.firebasestorage.app",
    messagingSenderId: "315293105146",
    appId: "1:315293105146:web:47e80502e198cfc1900243",
    measurementId: "G-KSFDJZ5DP5"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

let currentRoomId = null;
let saveTimeout = null;
let ignoreChange = false;
let unsubscribeRoom = null;

document.getElementsByClassName("entire-container")[0].style.display = "flex";
document.getElementsByClassName("codespace-container")[0].style.display = "none";

function createId(){
    let id_letters = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM12345678901234567890";
    var count = id_letters.length;
    var code = "";

    for(let i = 0; i < 25; i++){
        code += id_letters[Math.floor(Math.random() * count)];
    }

    return code;
}

function startRealtimeSync(){
    if(unsubscribeRoom != null){
        unsubscribeRoom();
    }

    unsubscribeRoom = onSnapshot(doc(db, "rooms", currentRoomId), function(snapshot){

        if(!snapshot.exists()){
            return;
        }

        let data = snapshot.data();

        if(window.editor.getValue() !== data.code){
            ignoreChange = true;
            window.editor.setValue(data.code);
            ignoreChange = false;
        }

    });
}

async function createRoom(user_name, room_name){

    let room_id = createId();

    let room_enter_code = Math.floor(Math.random() * 9000) + 1000;

    await setDoc(doc(db, "rooms", room_id), {
        roomName: room_name,
        roomEnterCode: room_enter_code,

        people: {
            admin: user_name,
            user: []
        },

        code: `console.log("Hello, Gather.js!");`
    });

    await setDoc(doc(db, "rooms_security", String(room_enter_code)), {
        roomID: room_id
    });

    currentRoomId = room_id;

    document.getElementById("room-name").textContent = room_name;

    document.getElementById("room-code").textContent =
    "Room Code: " + room_enter_code;

    ignoreChange = true;

    window.editor.setValue(`console.log("Hello, Gather.js!");`);

    ignoreChange = false;

    document.getElementsByClassName("entire-container")[0].style.display = "none";

    document.getElementsByClassName("codespace-container")[0].style.display = "flex";

    startRealtimeSync();

    console.log("room created:", room_id);

    alert("Your room enter code is " + room_enter_code);
}

async function enterRoom(user_name, room_enter_code){

    let securitySnap = await getDoc(
        doc(db, "rooms_security", String(room_enter_code))
    );

    if(!securitySnap.exists()){
        console.log("room not found");
        return;
    }

    let room_id = securitySnap.data().roomID;

    currentRoomId = room_id;

    let roomSnap = await getDoc(
        doc(db, "rooms", room_id)
    );

    if(!roomSnap.exists()){
        console.log("room data broken");
        return;
    }

    let roomData = roomSnap.data();

    let users = roomData.people.user;

    users.push(user_name);

    await setDoc(doc(db, "rooms", room_id), {
        roomName: roomData.roomName,
        roomEnterCode: roomData.roomEnterCode,

        people: {
            admin: roomData.people.admin,
            user: users
        },

        code: roomData.code
    });

    document.getElementById("room-name").textContent =
    roomData.roomName;

    document.getElementById("room-code").textContent =
    "Room Code: " + roomData.roomEnterCode;

    document.getElementsByClassName("entire-container")[0].style.display =
    "none";

    document.getElementsByClassName("codespace-container")[0].style.display =
    "flex";

    ignoreChange = true;

    window.editor.setValue(roomData.code);

    ignoreChange = false;

    startRealtimeSync();

    console.log("entered room");
}

async function deleteServer(room_enter_code){

    let securitySnap = await getDoc(
        doc(db, "rooms_security", String(room_enter_code))
    );

    if(!securitySnap.exists()){
        console.log("room not found");
        return;
    }

    let room_id = securitySnap.data().roomID;

    await deleteDoc(
        doc(db, "rooms", room_id)
    );

    await deleteDoc(
        doc(db, "rooms_security", String(room_enter_code))
    );

    console.log("server deleted");
}

document.getElementById("create-room-btn").addEventListener("click", function(){

    let un = prompt("Enter your nickname.");

    let rn = prompt("Enter room name.");

    createRoom(un, rn);

});

document.getElementById("room-search-btn").addEventListener("click", function(){

    let un = prompt("Enter your nickname.");

    let re = document.getElementById("room-search-area").value;

    enterRoom(un, re);

});

document.getElementById("delete-server").addEventListener("click", async function(){

    let roomSnap = await getDoc(
        doc(db, "rooms", currentRoomId)
    );

    if(!roomSnap.exists()){
        return;
    }

    let roomData = roomSnap.data();

    await deleteServer(roomData.roomEnterCode);

    document.getElementsByClassName("codespace-container")[0].style.display =
    "none";

    document.getElementsByClassName("entire-container")[0].style.display =
    "flex";

    currentRoomId = null;

    if(unsubscribeRoom != null){
        unsubscribeRoom();
    }

    console.log("deleted");

});

window.addEventListener("keydown", function(e){

    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){

        e.preventDefault();

        console.log("saved!");
    }

    if(e.key === "F5"){

        e.preventDefault();

        let code = window.editor.getValue();

        let output = "";

        let oldLog = console.log;

        console.log = function(...args){

            output += args.join(" ") + "\n";

        };

        try{

            new Function(code)();

        }
        catch(err){

            output += err;

        }

        console.log = oldLog;

        document.getElementById("runner").textContent = output;
    }

});

require.config({
    paths: {
        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {

    window.editor = monaco.editor.create(
        document.getElementById("editor"),
        {
            value: `console.log("Hello, Gather.js!");`,
            language: "javascript",
            theme: "vs-dark",
            automaticLayout: true,
            fontSize: 20
        }
    );

    window.editor.onDidChangeModelContent(function(){

        if(currentRoomId == null){
            return;
        }

        if(ignoreChange){
            return;
        }

        clearTimeout(saveTimeout);

        saveTimeout = setTimeout(async function(){

            await setDoc(doc(db, "rooms", currentRoomId), {
                code: window.editor.getValue()
            }, { merge: true });

            console.log("saved");

        }, 100);

    });

});
