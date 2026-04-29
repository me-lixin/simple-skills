const addSkillDoc = document.querySelector('.add-skill');
const asideDoc = document.querySelector('main aside');
const sectionDoc = document.querySelector('main section');
const skillInfoDoc = document.querySelector('.skill-info')
const backDoc = document.querySelector('.return')
const rangeDoc = document.querySelectorAll('.skill-form input[type="range"]')
const durationDoc = document.querySelectorAll('.duration')
const contentDoc = document.querySelector('.content')
const contentDivDoc = document.querySelectorAll('.content>div')
const logInfoDoc = document.querySelector('.log-info');
const maskBtDoc = document.querySelector('.mask');
const maskDivDocs = document.querySelectorAll('.mask div');
const formDoc = document.getElementById('skillForm')
const menuBtDoc = document.querySelector('.menu');
const timerBtMode = document.querySelector('.timer-mode');
const liTagDocs = document.querySelectorAll('.content li');
const download = document.querySelector('.download');
const swtichBtDoc = document.querySelector('.switch');
// 统计图
const tooltip = document.querySelector('.tooltip');
const offscreenCanvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(300, 260)
    : document.createElement('canvas');
offscreenCanvas.width = 300;
offscreenCanvas.height = 260;
const offCtx = offscreenCanvas.getContext('2d');
const canvas = document.getElementById('lineChart');
const ctx = canvas.getContext('2d');
// 计时
const onOffDoc = document.querySelector('#onOff');
const timeShows = document.querySelectorAll('.time-show');
const reset = document.querySelector('#reset');

//indexDB常量
const DB_NAME = 'skillManage';
const DB_VERSION = 12;
const DB_STORE_NAME = 'skill';
const DB_MODE = 'readwrite';
const MILLISECOND = 86400000;

//全局变量
let db;
let dataMap = new Map();
let currentPanel;
let list = [];
let logItem = {};
let touchCount = 0;
let count = 0;
let timeStamp;
let intervalId;
let intervalId2;
let dataXY = [];
let hasSavedOnExit = false;
//导入导出
let key = '';
const eiport = document.querySelector('#eiport');
// 缓存图片资源

formDoc.addEventListener('reset', () => {
    durationDoc[0].textContent = '600';
    durationDoc[1].textContent = '9';
    for (const item of formDoc) {
        if (item.type === 'hidden') {
            item.value = 0;
        }
    }
})
formDoc.reset();
initalizeDB();
contentShow();
// 添加技能按钮
addSkillDoc.addEventListener('click', () => {
    let hiddenNode = document.querySelector('#id')
    hiddenNode?.parentNode.removeChild(hiddenNode);
    formDoc.reset();
    contentShow('skill');
})
// 返回按钮
backDoc.addEventListener('click', () => {
    if (window.innerWidth < 650) {
        sectionDoc.classList.toggle('display-none', false)
        asideDoc.classList.toggle('display-none', true)
    } else {
        asideDoc.classList.toggle('display-none', true)

    }
})
// 菜单按钮
menuBtDoc.addEventListener('click', () => {
    contentShow('menu');
})
// 保存按钮
formDoc.addEventListener('submit', (e) => {
    e.preventDefault()
    const formData = new FormData(formDoc)
    if (!formData.has('id')) {
        let id = getSkillId();
        formData.append('id', id)
    }
    updateDataToStore(Object.fromEntries(formData))
    contentShow();
})

//默认数据填充
function defaultDataFill(data) {
    data.dateTime = Date.now();
    data.addUp = data.addUp || 0;
    data.todayAddUp = data.todayAddUp || 0;
    data.todayNeedTime = Number(data.todayTime) * 1000 * 60 * 60 - Number(data.todayAddUp);
    data.sumNeedTime = Number(data.skillTime) * 1000 * 60 * 60 - Number(data.addUp);
    data.h = data.h || 0;
    data.m = data.m || 0;
    data.s = data.s || 0;
    data.h2 = Number(data.todayTime) - Math.ceil(Number(data.todayAddUp / 1000 / 60 / 60));
    data.m2 = data.m2 || 0;
    data.s2 = data.s2 || 0;
    data.timerMode = data.timerMode || '0';
}

function initalizeDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (e) => {
        console.log('数据库打开');
        db = e.target.result;
        selectDataFromStore();
        selectLogToStatistics(1);
        switchTag('log');
        const now = new Date();
        selectLog(new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf()
            , Date.now());
    }
    request.onerror = () => {
        alert("请允许我的 web 应用使用 IndexedDB！");
    }
    request.onupgradeneeded = (e) => {
        let skillDB = e.target.result.createObjectStore(DB_STORE_NAME, {keyPath: 'id'})
        let logStore = e.target.result.createObjectStore('skillLog', {keyPath: 'id', autoIncrement: true})
        logStore.createIndex('dateTime', 'dateTime', {unique: true});
        skillDB.createIndex('dateTime', 'dateTime', {unique: true});
        skillDB.add({
            "skillName": "英语",
            "skillTime": "1000",
            "todayTime": "3",
            "id": "-1",
            "dateTime": 1735957906417,
            "addUp": 0,
            "todayAddUp": 0,
            "todayNeedTime": 10800000,
            "sumNeedTime": 3600000000,
            "h": 0,
            "m": 0,
            "s": 0,
            "h2": 3,
            "m2": 0,
            "s2": 0,
            "timerMode": "0"
        })
        console.log('数据库构建');

    }
}

function createStore(mode, storeName) {
    return mode ? db.transaction(storeName, mode).objectStore(storeName) :
        db.transaction(storeName).objectStore(storeName);
}

function selectDataFromStore() {
    let store = createStore(DB_MODE, DB_STORE_NAME);
    const index = store.index('dateTime');
    index.openCursor().onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
            dataToElement(e.target.result.value)
            cursor.continue();
        }
    }
    console.log('数据加载请求成功');
}

function updateDataToStore(data) {
    let store = createStore(DB_MODE, DB_STORE_NAME)
    defaultDataFill(data);
    console.log(data)
    store.put(data).onsuccess = (e) => {
        console.log('数据更新成功', e.target.result);
        dataToElement(data);
    };
}

function addAllSkill(data) {
        let store = createStore(DB_MODE, DB_STORE_NAME)
        data.forEach(item => store.put(item));
}

function deleteSkill(dataId) {
    let store = createStore(DB_MODE, DB_STORE_NAME)
    return new Promise((resolve) => {
        store.delete(dataId).onsuccess = (e) => {
            console.log('数据删除成功', e.target);
            resolve(e.target.result)
        };
    })
}

function selectLogToStatistics(offset) {
    list = [];
    const store = createStore('readonly', 'skillLog');
    const index = store.index('dateTime');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear()
        , now.getMonth() - offset
        , now.getDate(), 0, 0, 0);
    let current;
    let offsetTem;
    let lastMax;

    let range;
    if (offset === 1) {
        current = now.getDate() + 1;
        offsetTem = 30;
        let num = current - offsetTem;
        lastMax = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        for (let i = 0; i < offsetTem; i++) {
            if (num <= 0) {
                let lastDay = lastMax + num;
                const month = now.getMonth()===0 ? 12 : now.getMonth();
                list.push({
                    'label': `${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
                    , 'month': month - 1, 'day': lastDay
                });
                num++;
            } else {
                list.push({
                    'label': `${(now.getMonth() + 1).toString().padStart(2, '0')}-${num.toString().padStart(2, '0')}`
                    , 'month': now.getMonth(), 'day': num
                });
                num++;
            }
        }
    } else {
        offsetTem = 12;
        current = now.getMonth() + 1;
        let num = current - offsetTem;
        lastMax = new Date(now.getFullYear(), 0, 0).getMonth() + 1;
        for (let i = 0; i < offsetTem; i++) {
            if (num < 0) {
                let month = lastMax + num;
                list.push({
                    'label': `${now.getFullYear() - 1}-${(month + 1).toString().padStart(2, '0')}`
                    , 'year': now.getFullYear() - 1, 'month': month
                });
                num++;
            } else {
                list.push({
                    'label': `${now.getFullYear()}-${(num + 1).toString().padStart(2, '0')}`
                    , 'year': now.getFullYear(), 'month': num
                });
                num++;
            }
        }
        range = IDBKeyRange.bound(lastMonth.valueOf(), Date.now());
    }

    index.getAll(range).onsuccess = (e) => {
        for (let i = 0; i < list.length; i++) {
            let sum = 0;
            for (const item of e.target.result) {
                const year = new Date(item.startDateTime).getFullYear();
                const month = new Date(item.startDateTime).getMonth();
                const itemDay = new Date(item.startDateTime).getDate();
                if (year === list[i].year && month === list[i].month) {
                    sum += item.duration;
                }
                if (month === list[i].month && itemDay === list[i].day) {
                    sum += item.duration;
                }
            }
            list[i].data = Math.floor(sum / 1000 / 60 / 60);
        }
        // 初次绘制
        console.log(list);

        initChart(offset === 1 ? 18 : 450);
    }
}

function selectLog(startTime, endTime) {
    const store = createStore('readonly', 'skillLog');
    const index = store.index('dateTime');
    if (startTime === 0) {
        return new Promise((resolve) => {
            index.getAll().onsuccess = (e) => {
                resolve(e.target.result);
            }
        })
    }
    const range = IDBKeyRange.bound(startTime, endTime);
    //index.openCursor(range, 'prev')降序查询
    const title = document.createElement('p');
    title.innerHTML = `<strong>${getNowDate(endTime)}</strong>`;
    loading.before(title);
    index.openCursor(range, 'prev').onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
            let item = cursor.value
            const content = document.createElement('p');
            let hours = Math.trunc(item.duration / 1000 / 60 / 60);
            let minutes = Math.trunc(item.duration / 1000 / 60 % 60);
            content.innerHTML = `[${getNowTime(item.startDateTime)}]
            学习<strong>[${item.skillName}]
            </strong> <b>${hours}</b>小时<b>${minutes}</b>分钟`;
            //在loading标签前面插入
            loading.before(content);
            cursor.continue();
        }
    }
}

function updateLog(data) {
    if (!data.duration || data.duration < 60000) {
        return;
    }
    let store = createStore(DB_MODE, 'skillLog');
    data.dateTime = data.startDateTime;
    store.put(data).onsuccess = (e) => {
        logPanel(data);
        selectLogToStatistics(1)
        console.log('log数据添加成功', e.target.result);
    };
}
function addAllLog(data) {
    let store = createStore(DB_MODE, 'skillLog');
    data.forEach(item=>store.put(item));
}

function logPanel(data) {
    let firstLog = logInfoDoc.firstElementChild;
    if (firstLog.textContent !== getNowDate(data.startDateTime)) {
        let newFirstLog = document.createElement('p');
        newFirstLog.innerHTML = `<strong>${getNowDate(data.startDateTime)}</strong>`;
        firstLog.before(newFirstLog);
        firstLog = newFirstLog;
    }
    const content = document.createElement('p');
    let hours = Math.trunc(data.duration / 1000 / 60 / 60);
    let minutes = Math.trunc(data.duration / 1000 / 60 % 60);
    content.innerHTML = `[${getNowTime(data.startDateTime)}]
    学习<strong>[${data.skillName}]
    </strong> <b>${hours}</b>小时<b>${minutes}</b>分钟`;
    firstLog.after(content);
}

function dataToElement(item) {
    dataMap.set(item.id, item);
    constructorPanel(item)
}


for (const range of rangeDoc) {
    range.addEventListener('input', () => {
        updateDuration(range)
    })
}

function updateDuration(range) {
    if (range.value >= 200) {
        durationDoc[0].textContent = range.value;
    } else {
        durationDoc[1].textContent = range.value;
    }
}

// 动态面板
function constructorPanel(data) {
    const div = document.getElementById(data.id) || document.createElement('div');

    div.setAttribute('id', data.id)
    fillPanel(div, data);
    sectionDoc.prepend(div);
}

sectionDoc.addEventListener('click', async (e) => {
    let divDoc;
    if (e.target.id) {
        divDoc = e.target;
    }
    if (e.target.parentNode.id) {
        divDoc = e.target.parentNode;
    }
    if (e.target.parentNode.parentNode.id) {
        divDoc = e.target.parentNode.parentNode;
    }
    if (e.target.parentNode.parentNode.parentNode.id) {
        divDoc = e.target.parentNode.parentNode.parentNode;
    }
    if (e.target.className === 'start-skill on') {
        maskBtDoc.style.visibility = 'visible';
        maskBtDoc.focus();
        currentPanel = dataMap.get(divDoc.id)
        onOffDoc.value = 'on';
        timeShows[0].textContent = `${currentPanel.h.toString().padStart(2, '0')}:${currentPanel.m.toString().padStart(2, '0')}:${currentPanel.s.toString().padStart(2, '0')}`;
        timeShows[1].textContent = `${currentPanel.h2.toString().padStart(2, '0')}:${currentPanel.m2.toString().padStart(2, '0')}:${currentPanel.s2.toString().padStart(2, '0')}`;

        if (currentPanel.timerMode === '0') {
            timerBtMode.textContent = '倒计时';
            timerBtMode.className = 'timer-mode reduce'
            maskDivDocs[1].classList.toggle('display-none', false);
            maskDivDocs[2].classList.toggle('display-none', true);
        } else {
            timerBtMode.textContent = '正计时';
            timerBtMode.className = 'timer-mode increase'
            maskDivDocs[1].classList.toggle('display-none', true);
            maskDivDocs[2].classList.toggle('display-none', false);
        }
        onOff(onOffDoc);
        return;
    }
    if (e.target.className === 'delete-skill') {
        console.log(divDoc.id);
        let deleteID = await deleteSkill(divDoc.id);
        console.log('deleteID', deleteID);
        divDoc.parentNode.removeChild(divDoc);
        formDoc.reset();
        return;
    }
    if (divDoc) {
        fillForm(dataMap.get(divDoc.id))
        contentShow('skill');
    }
})

function contentShow(type) {
    switch (type) {
        case 'skill':
            asideDoc.classList.toggle('display-none', false);
            skillInfoDoc.classList.toggle('display-none', false);
            contentDoc.classList.toggle('display-none', true);
            if (window.innerWidth < 650) {
                sectionDoc.classList.toggle('display-none', true);
            } else {
                sectionDoc.classList.toggle('display-none', false);
            }
            break;
        case 'menu':
            asideDoc.classList.toggle('display-none', false);
            skillInfoDoc.classList.toggle('display-none', true);
            contentDoc.classList.toggle('display-none', false);
            if (window.innerWidth < 650) {
                sectionDoc.classList.toggle('display-none', true);
            } else {
                sectionDoc.classList.toggle('display-none', false);
            }
            break;
        default:
            if (window.innerWidth < 650) {
                sectionDoc.classList.toggle('display-none', false);
                asideDoc.classList.toggle('display-none', true);
            } else {
                asideDoc.classList.toggle('display-none', false);
                skillInfoDoc.classList.toggle('display-none', true);
                contentDoc.classList.toggle('display-none', false);
            }
    }
}

function fillPanel(div, data) {
    div.innerHTML = `
    <h2>${data.skillName}</h2>
    <p>你要用<b>${data.skillTime}</b>个小时来学<strong>[${data.skillName}]</strong>,要是学不会,你将<b>[生不如死]</b>!</p>
    <ul>
        <li>累计学习:<b>${Math.ceil(data.addUp === 0 ? 0 : data.addUp / 1000 / 60 / 60)}</b>小时</li>
        <li>今天计划学:<b>${data.todayTime}</b>小时</li>
        <li>今天已学习:<b>${Math.ceil(data.todayAddUp === 0 ? 0 : data.todayAddUp / 1000 / 60 / 60)}</b>小时</li>
        <li>今天还需学:<b>${Math.trunc(data.todayNeedTime <= 0 ? 0 : data.todayNeedTime / 1000 / 60 / 60)}</b>小时</li>
        <li>距离学会还剩:<b>${Math.trunc(data.sumNeedTime <= 0 ? 0 : data.sumNeedTime / 1000 / 60 / 60)}</b>小时</li>
</ul>
<button type="button" class="delete-skill"></button>
<button value=${data.id} type="button" class="start-skill on"></button>`

}

function fillForm(item) {
    for (const key in item) {
        let input = document.getElementById(key)
        if (!input) {
            input = document.createElement('input');
            input.id = key;
            input.type = 'hidden';
            input.name = key;
            input.value = item[key];
            formDoc.appendChild(input);
        } else if (input.type === 'range') {
            input.value = item[key];
            updateDuration(input)
        } else {
            input.value = item[key];
        }
    }
}

function getSkillId() {
    if (localStorage.getItem('skillId')) {
        let id = Number(localStorage.getItem('skillId')) + 1
        localStorage.setItem('skillId', id)
        return id;
    } else {
        localStorage.setItem('skillId', 1);
        return 1;
    }
}

//暂停开始
onOffDoc.addEventListener('click', (e) => {
    e.stopPropagation()
    onOff(e.target);
})
// 重置今日数据
reset.addEventListener('click', (e) => {
    e.stopPropagation()
    //重置当前数据
    currentPanel.h = 0;
    currentPanel.todayAddUp = 0;
    currentPanel.todayNeedTime = Number(currentPanel.todayTime) * 1000 * 60 * 60;
    currentPanel.h = 0;
    currentPanel.m = 0;
    currentPanel.s = 0;
    currentPanel.h2 = currentPanel.todayTime;
    currentPanel.m2 = 0;
    currentPanel.s2 = 0;
    timeShows[1].textContent = `${currentPanel.h2.toString().padStart(2, '0')}:${currentPanel.m2.toString().padStart(2, '0')}:${currentPanel.s2.toString().padStart(2, '0')}`;
    timeShows[0].textContent = `${currentPanel.h.toString().padStart(2, '0')}:${currentPanel.m.toString().padStart(2, '0')}:${currentPanel.s.toString().padStart(2, '0')}`;

    updateDataToStore(currentPanel);
})

function getNowTime(value) {
    const date = new Date(value);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

function getNowDate(value) {
    const date = new Date(value);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

function onOff(obj) {
    if (obj.value === 'off') {
        obj.value = 'on';
        obj.className = 'on-off on'
        clearInterval(intervalId);
        clearInterval(intervalId2);
        reset.classList.toggle('display-none', false);
        //保存日志
        logItem.endDateTime = Date.now();
        logItem.duration = logItem.endDateTime - logItem.startDateTime;
        updateLog(logItem);
        updateDataToStore(currentPanel);
    } else {
        //开启日志
        logItem.startDateTime = Date.now();
        logItem.skillName = currentPanel.skillName;
        logItem.skillId = currentPanel.id;
        obj.value = 'off';
        obj.className = 'on-off off'
        intervalId = setInterval(run, 1000);
        intervalId2 = setInterval(run2, 1000);
        reset.classList.toggle('display-none', true);
    }
}

function run() {
    currentPanel.s++;
    currentPanel.addUp = Number(currentPanel.addUp) + 1000;
    currentPanel.todayAddUp = Number(currentPanel.todayAddUp) + 1000;
    if (currentPanel.s === 60) {
        currentPanel.s = 0;
        currentPanel.m++;
        updateDataToStore(currentPanel);
    }
    if (currentPanel.m === 60) {
        currentPanel.m = 0;
        currentPanel.h++;
    }
    timeShows[0].textContent = `${currentPanel.h.toString().padStart(2, '0')}:${currentPanel.m.toString().padStart(2, '0')}:${currentPanel.s.toString().padStart(2, '0')}`;

}

function run2() {
    currentPanel.sumNeedTime = Number(currentPanel.sumNeedTime) - 1000;
    currentPanel.todayNeedTime = Number(currentPanel.todayNeedTime) - 1000;
    if (currentPanel.m2 == 0 && currentPanel.s2 == 0) {
        currentPanel.m2 = 60;
        currentPanel.h2--;
    }
    if (currentPanel.s2 == 0) {
        currentPanel.s2 = 60;
        currentPanel.m2--;
    }
    currentPanel.s2--;
    timeShows[1].textContent = `${currentPanel.h2.toString().padStart(2, '0')}:${currentPanel.m2.toString().padStart(2, '0')}:${currentPanel.s2.toString().padStart(2, '0')}`;
}


timerBtMode.addEventListener('click', (e) => {
    e.stopPropagation()
    timerModeSwitch(e.target);
})

function timerModeSwitch(modeDiv) {
    if (modeDiv.textContent === '倒计时') {
        modeDiv.textContent = '正计时';
        currentPanel.timerMode = '1'
        modeDiv.className = 'timer-mode increase'
        maskDivDocs[1].style.display = 'none';
        maskDivDocs[2].style.display = 'block';
    } else {
        modeDiv.textContent = '倒计时';
        currentPanel.timerMode = '0'
        modeDiv.className = 'timer-mode reduce'
        maskDivDocs[2].style.display = 'none';
        maskDivDocs[1].style.display = 'block';
    }
}

//退出面板保存当前的计时
function saveState() {
    //看板更新
    maskBtDoc.style.visibility = 'hidden';
    fillForm(currentPanel);
    clearInterval(intervalId);
    clearInterval(intervalId2);
    //日志
    if (onOffDoc.value === 'off') {
        logItem.endDateTime = Date.now();
        logItem.duration = logItem.endDateTime - logItem.startDateTime;
        onOff(onOffDoc)
    }
}
//文件导入导出
eiport.addEventListener('click', async (e) => {
    e.stopPropagation()
    if (e.target.className === 'import') {
        try {
            if (typeof window.showOpenFilePicker === 'function') {
                const pickerOpts = {
                    types: [
                        {
                            accept: {
                                "text/*": [".json"],
                            },
                        },
                    ],
                    excludeAcceptAllOption: true,
                    multiple: false,
                };
                // 打开文件选择器
                const [fileHandle] = await window.showOpenFilePicker(pickerOpts);
                // 获取文件内容
                const fileData = await fileHandle.getFile();
                const fileReader = new FileReader();
                fileReader.addEventListener('load', () => {
                    try {
                        const parse = JSON.parse(fileReader.result);
                        if (!Array.isArray(parse)) {
                            throw new Error('Invalid import payload');
                        }
                        if (fileData.name.includes('日志')) {
                            addAllLog(parse)
                        } else {
                            addAllSkill(parse)
                        }
                    } catch (error) {
                        alert('导入失败，请检查 JSON 文件内容是否正确。');
                        console.error('导入解析失败', error);
                    }
                })
                fileReader.readAsText(fileData)
            } else {
                alert('当前浏览器不支持文件系统选择器，请使用 Chromium 内核浏览器导入。');
            }
        } catch (err) {
            if (err?.name !== 'AbortError') {
                alert('导入失败，请检查 JSON 文件内容是否正确。');
                console.error('导入失败', err);
            }
        }

    }
    if (e.target.className === 'export') {
        const logList = await selectLog(0, Date.now())
        const blob = new Blob([JSON.stringify(logList)], {type: "text/json"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '日志.json';
        link.click();
        let store = createStore('readonly', DB_STORE_NAME);
        store.getAll().onsuccess = (e) => {
            const blob = new Blob([JSON.stringify(e.target.result)], {type: "text/json"});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = '技能.json';
            link.click();
        }

    }
})
//监听打开文件导入导出面板
window.addEventListener('keydown', (e) => {
    key += e.key
    if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        eiport.classList.toggle('display-none', false)
    }
    if (e.key === 'Escape') {
        eiport.classList.toggle('display-none', true)
    }
    setTimeout(() => {
        key = '';
    }, 800)

})

window.addEventListener('click', (e) => {
    touchCount++;
    if (touchCount === 3) {
        eiport.classList.toggle('display-none', false)
    }
    if (touchCount === 2) {
        eiport.classList.toggle('display-none', true)
    }
    setTimeout(() => {
        touchCount = 0;
    }, 800)

})
// 键盘事件
maskBtDoc.addEventListener('keydown', (e) => {
    e.preventDefault();
    if (e.code === 'Escape') {
        saveState();
    } else if (e.code === 'Space') {
        onOff(onOffDoc);
    } else if (e.code === 'Tab') {
        timerModeSwitch(timerBtMode)
    }
})
// 蒙版双击事件
maskBtDoc.addEventListener('click', () => {
    touchCount++;
    if (touchCount > 1) {
        saveState()
    }
    setTimeout(() => {
        touchCount = 0;
    }, 800)
});

// 监听标签切换
contentDoc.addEventListener('click', (e) => {
    switchTag(e.target.id)
})
//加载更多日志
loading.addEventListener('click', () => {
    loading.textContent = '加载中......'
    loading.disabled = true;
    setTimeout(() => {
        const now = new Date();
        // selectSkillLogList(today.valueOf() - (MILLISECOND * (count + 1))
        //     , today.valueOf() - MILLISECOND * count);
        selectLog(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count + 1)).valueOf()
            , new Date(now.getFullYear(), now.getMonth(), now.getDate() - count).valueOf() - 1);
        count++;
        loading.textContent = '点击加载历史数据'
        loading.disabled = false;
        loading.classList.toggle('display-none', false);
    }, 500);
})
// 下载日志
download.addEventListener('click', async () => {
    const logList = await selectLog(0, Date.now())
    let logStr = '';
    for (const item of logList) {
        let hours = Math.trunc(item.duration / 1000 / 60 / 60);
        let minutes = Math.trunc(item.duration / 1000 / 60 % 60);
        logStr += `<br>[${getNowDate(item.startDateTime)} ${getNowTime(item.startDateTime)}]
        学习<strong>[${item.skillName}]
        </strong> <b>${hours}</b>小时<b>${minutes}</b>分钟`;
    }
    const blob = new Blob([logStr], {type: "text/html"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '日志.html';
    link.click();

});

function switchTag(tagId) {
    switch (tagId) {
        case 'log':
            contentDivDoc[1].classList.toggle('display-none', false);
            contentDivDoc[2].classList.toggle('display-none', true);
            contentDivDoc[3].classList.toggle('display-none', true);
            liTagDocs[0].classList.toggle('background-tag', true);
            liTagDocs[1].classList.toggle('background-tag', false);
            liTagDocs[2].classList.toggle('background-tag', false);
            break;
        case 'statistics':
            contentDivDoc[1].classList.toggle('display-none', true);
            contentDivDoc[2].classList.toggle('display-none', false);
            contentDivDoc[3].classList.toggle('display-none', true);
            liTagDocs[1].classList.toggle('background-tag', true);
            liTagDocs[0].classList.toggle('background-tag', false);
            liTagDocs[2].classList.toggle('background-tag', false);
            break;
        case 'instruction':
            contentDivDoc[1].classList.toggle('display-none', true);
            contentDivDoc[2].classList.toggle('display-none', true);
            contentDivDoc[3].classList.toggle('display-none', false);
            liTagDocs[2].classList.toggle('background-tag', true);
            liTagDocs[1].classList.toggle('background-tag', false);
            liTagDocs[0].classList.toggle('background-tag', false);
            break;
        default:
            break;
    }
}

// 监听报表切换
swtichBtDoc.addEventListener('click', (e) => {
    if (e.target.textContent === '年') {
        e.target.textContent = '月';
        selectLogToStatistics(12);
    } else {
        e.target.textContent = '年';
        selectLogToStatistics(1);
    }
})
// 监听页面关闭
window.addEventListener('unload', () => {
    persistBeforeExit();
})
// 监听页面刷新
window.addEventListener('beforeunload', () => {
    persistBeforeExit();
})

function persistBeforeExit() {
    if (hasSavedOnExit) {
        return;
    }
    hasSavedOnExit = true;
    logItem.endDateTime = Date.now();
    logItem.duration = logItem.endDateTime - logItem.startDateTime;
    updateLog(logItem);
    if (currentPanel) updateDataToStore(currentPanel);
}
// 后台运行逻辑
document.addEventListener('visibilitychange', () => {
    if (document.hidden && onOffDoc.value === 'off') {
        console.log('页面隐藏，降低任务频率');
        timeStamp = Date.now();
        clearInterval(intervalId);
        clearInterval(intervalId2);
    } else if (!document.hidden && onOffDoc.value === 'off') {
        console.log('页面激活，恢复任务频率');
        // 恢复任务逻辑
        restorationTiem();
    }
});

function restorationTiem() {
    let timeDifference = Date.now() - timeStamp;
    let h = Math.trunc(timeDifference / 1000 / 60 / 60);
    let m = Math.trunc(timeDifference / 1000 / 60 % 60);
    let s = Math.trunc(timeDifference / 1000 % 60);
    currentPanel.h = Number(currentPanel.h) + h;
    currentPanel.m = Number(currentPanel.m) + m;
    currentPanel.s = Number(currentPanel.s) + s;
    if (currentPanel.m >= 60) {
        currentPanel.h++;
        currentPanel.m -= 60;
    }
    if (currentPanel.s >= 60) {
        currentPanel.m++;
        currentPanel.s -= 60;
    }
    currentPanel.h2 = Number(currentPanel.h2) - h;
    currentPanel.m2 = Number(currentPanel.m2) - m;
    currentPanel.s2 = Number(currentPanel.s2) - s;
    if (currentPanel.m2 <= 0) {
        currentPanel.h2--;
        currentPanel.m2 += 60;
    }
    if (currentPanel.s2 <= 0) {
        currentPanel.m2--;
        currentPanel.s2 += 60;
    }
    run();
    run2();
    currentPanel.sumNeedTime = currentPanel.sumNeedTime - timeDifference;
    currentPanel.todayNeedTime = currentPanel.todayNeedTime - timeDifference;
    currentPanel.addUp = currentPanel.addUp + timeDifference;
    currentPanel.todayAddUp = currentPanel.todayAddUp + timeDifference;

    intervalId = setInterval(run, 1000);
    intervalId2 = setInterval(run2, 1000);
}

// 绘制坐标系和刻度
function drawGrid(maxData) {
    const padding = 30;
    const width = offscreenCanvas.width - padding * 2;
    const height = offscreenCanvas.height - padding * 2;
    const stepX = width / (list.length - 1);
    const stepY = height / maxData;

    // 绘制 X 轴和 Y 轴
    offCtx.beginPath();
    offCtx.moveTo(padding, padding - 15);
    offCtx.lineTo(padding, offscreenCanvas.height - padding);
    offCtx.lineTo(offscreenCanvas.width - padding + 15, offscreenCanvas.height - padding);
    offCtx.strokeStyle = '#000';
    offCtx.stroke();
    offCtx.font = '14px monospace';
    offCtx.fillText(maxData === 18 ? '月度统计' : '年度统计', offscreenCanvas.width / 2, padding / 2);
    offCtx.font = '12px monospace';

    // 绘制 X 轴刻度
    list.forEach((item, i) => {
        const x = padding + i * stepX;
        if (maxData === 18 && i !== 0 && i % 4 === 0) {
            offCtx.moveTo(x, offscreenCanvas.height - padding)
            offCtx.lineTo(x, offscreenCanvas.height - padding + 5)
            offCtx.stroke();
            offCtx.fillText(item.day > 9 ? item.day : '0' + item.day, x - 3, offscreenCanvas.height - padding + 20);
        }
        if (maxData === 450 && i !== 0 && i % 2 === 0) {
            offCtx.moveTo(x, offscreenCanvas.height - padding)
            offCtx.lineTo(x, offscreenCanvas.height - padding + 5)
            offCtx.stroke();
            offCtx.fillText(item.month + 1 > 9 ? item.month + 1 : '0' + (item.month + 1), x - 3, offscreenCanvas.height - padding + 20);
        }
    });

    // 绘制 Y 轴刻度
    for (let i = 0; i <= maxData; i++) {
        const y = offscreenCanvas.height - padding - (i * stepY);
        if (maxData === 18 && i !== 0 && i % 3 === 0) {
            offCtx.moveTo(padding - 5, y)
            offCtx.lineTo(padding, y)
            offCtx.stroke();
            offCtx.fillText(i > 9 ? i : '0' + i, padding - 22, y + 3);
        }
        if (maxData === 450 && i !== 0 && i % 50 === 0) {
            offCtx.moveTo(padding - 5, y)
            offCtx.lineTo(padding, y)
            offCtx.stroke();
            offCtx.fillText(i > 9 ? i : '0' + i, padding - 30, y + 3);
            i += 59;

        }
    }
}

// 绘制折线
function drawLine(maxData) {
    const padding = 30;
    const width = offscreenCanvas.width - padding * 2;
    const height = offscreenCanvas.height - padding * 2;
    const stepX = width / (list.length - 1);
    const stepY = height / maxData;

    offCtx.beginPath();
    offCtx.moveTo(padding, offscreenCanvas.height - padding - (list[0].data * stepY));


    // 绘制折线
    list.forEach((point, i) => {
        const x = padding + i * stepX;
        const y = offscreenCanvas.height - padding - (point.data * stepY);
        offCtx.lineTo(x, y);
    });

    offCtx.strokeStyle = '#a22a2a'; // 折线颜色
    offCtx.lineWidth = 2;
    offCtx.stroke();
}

// 绘制数据点
function drawDataPoints(maxData) {
    const padding = 30;
    const width = offscreenCanvas.width - padding * 2;
    const height = offscreenCanvas.height - padding * 2;
    const stepX = width / (list.length - 1);
    const stepY = height / maxData;
    dataXY = []

    // 绘制每个数据点
    list.forEach((point, i) => {
        const x = padding + i * stepX;
        const y = offscreenCanvas.height - padding - (point.data * stepY);
        dataXY.push({'x': x, 'y': y})
        offCtx.beginPath();
        offCtx.arc(x, y, 2, 0, 2 * Math.PI);
        offCtx.fillStyle = '#a22a2a';
        offCtx.fill();
    });
    offCtx.fillStyle = '#000';

}

// 显示 Tooltip
function showTooltip(event) {
    const padding = 30;
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;
    if (mouseX < padding || mouseY < padding / 2 || mouseX > canvas.width - padding / 2 || mouseY > canvas.height - padding) {
        ctx.drawImage(offscreenCanvas, 0, 0);
        tooltip.style.display = 'none';
        return;
    }
    ctx.drawImage(offscreenCanvas, 0, 0);
    ctx.beginPath();
    ctx.moveTo(padding, mouseY);
    ctx.lineTo(offscreenCanvas.width - padding, mouseY);
    ctx.moveTo(mouseX, padding);
    ctx.lineTo(mouseX, offscreenCanvas.height - padding);
    ctx.strokeStyle = '#8a8a8a';
    ctx.stroke();
    dataXY.some((item, i) => {
        let dx = mouseX - item.x;
        let sqrtX = Math.sqrt(dx ** 2);
        if (sqrtX <= 3) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${mouseX + 10}px`;
            tooltip.style.top = `${mouseY - 30}px`;
            tooltip.innerText = `${list[i].label}: ${list[i].data}h`;
            return true;
        } else {
            tooltip.style.display = 'none';
        }
    })
}

// 初始化绘制
function initChart(maxData) {
    offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    drawGrid(maxData);
    drawLine(maxData);
    drawDataPoints(maxData);
    ctx.drawImage(offscreenCanvas, 0, 0);
}

// 监听鼠标移动事件
canvas.addEventListener('mousemove', showTooltip);

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        const swUrl = new URL('serviceWorkerCache.js', window.location.href).pathname;
        navigator.serviceWorker.register(swUrl).then((result) => console.log('注册成功', result));
    }
}

registerServiceWorker();