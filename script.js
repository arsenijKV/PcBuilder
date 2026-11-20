let componetsData = null;
let currentCategory = 'motherboard';
let cartList = []
const btm_rem_all = document.querySelector('#clear')
let price = document.querySelector('#total')
let power = document.querySelector('#watts')
let cartPower = 0
let cartTotalPrice = 0
const cart = document.querySelector('#cartList')
let errorEl = null
let errorTimer = null

const categorySelect = {
    cpu: [
        ["Сокет", "socket"],
        ["Ядра", "cores"],
        ["Потоки", "threads"],
        ["Частота", "boost_ghz"],
        ["TDP", "tdp_w"],
        ["Потребление", "power_draw_w"],
        ["Стоимость","price_eur"]
    ],

    gpu: [
        ["Видеопамять", "vram_gb"],
        ["Потребление", "tgp_w"],
        ["Длина", "length_mm"],
        ["PCIe", "pcie"],
        ["Потребление", "power_draw_w"],
        ["Стоимость","price_eur"]
    ],

    motherboard: [
        ["Сокет", "socket"],
        ["Чипсет", "chipset"],
        ["Форм-фактор", "form_factor"],
        ["Тип памяти", "ram_type"],
        ["Слоты RAM", "ram_slots"],
        ["Потребление", "power_draw_w"],
        ["Стоимость","price_eur"]
    ],

    ram: [
        ["Объём", "capacity_gb"],
        ["Комплект", "kit"],
        ["Скорость", "speed_mtps"],
        ["Задержка", "cas_latency"],
        ["Тип памяти", "ram_type"],
        ["Потребление", "power_draw_w"],
        ["Стоимость","price_eur"]
    ],

    storage: [
        ["Объём", "capacity_gb"],
        ["Интерфейс", "interface"],
        ["Форм-фактор", "form_factor"],
        ["Чтение", "read_mbps"],
        ["Запись", "write_mbps"],
        ["Потребление", "power_draw_w"],
        ["Стоимость","price_eur"]
    ],

    psu: [
        ["Мощность", "wattage_w"],
        ["Сертификация", "efficiency"],
        ["Форм-фактор", "form_factor"],
        ["Модульный", "modular"],
        
        ["Стоимость","price_eur"]
    ],

    case: [
        ["Форм-фактор", "form_factor"],
        ["Поддержка плат", "supports_form_factors"],
        ["Макс. длина GPU", "max_gpu_length_mm"],
        ["Макс. высота кулера", "max_cpu_cooler_mm"],
        ["Потребление", "power_draw_w"],
        ["Стоимость","price_eur"]
    ],
    cooler: [
        ["Тип охлаждения", "cooling_type"],
        ["Поддерживаемые сокеты", "supported_sockets"],
        ["Высота кулера", "height_mm"],
        ["Уровень шума", "noise_dba"],
        ["Потребление", "power_draw_w"],
        ["Стоимость", "price_eur"]
    ]
}


async function loadComponents() {

    const response = await fetch("./data/pc-builder-parts-expanded.json");
    componetsData = await response.json();
    componentsFilter()
}




function navigation(){
    const links = document.querySelectorAll('[data-category]')
    for(i = 0; i < links.length; i++){
        let link = links[i]
    
        link.addEventListener('click', function(event){
            event.preventDefault()
            currentCategory = link.dataset.category

            
            componentsFilter()
            
            
        })
    }
    
}




function renderComponents(components, category) {
    const grid = document.querySelector(".grid");
    grid.innerHTML = "";
    // if (components == null) {
    //     grid.textContent = "Obojdeshsia";
    //     return;
    // }
    for(i = 0; i< components.length; i++){
        let component = components[i]
     
        const card = document.createElement("div");
        card.classList.add("card");

        let compHTML = ''
        const list = categorySelect[category]

        for(j = 0; j< list.length; j++){
            let select = list[j]
            const label = select[0];
            const property = select[1];

            let value = component[property];

            if (Array.isArray(value)) {
                value = value.join(", ");
            }

            compHTML += `
                <dt>${label}</dt>
                <dd>${value ?? "—"}</dd>
            `;
        }
            
        
        card.innerHTML = `
            <h3>${component.vendor} ${component.model}</h3>

            <div class="specs">
                ${compHTML}
            </div>

            <button class="btn">Выбрать</button>
        `;


    
    

        grid.appendChild(card);

        const btn = card.querySelector('.btn')
        btn.addEventListener('click', function(){
            addCard(component)
            changeCartTotalPrice()
            changeCartPower()
            componentsFilter()
        })

        
        
    }
}


function addCard(component){
    
    const newCombined = {
        ...component,
        category: currentCategory
    }
    
    cartList.push(newCombined)

    const newCartList = cartList.filter(function(secondPiece){
        return secondPiece.category === currentCategory
    })
    

    const item = document.createElement("div");
    
    item.classList.add("cart-item");
    
    item.innerHTML = `
        <h3>${component.vendor} ${component.model}</h3>
        <button class="remove-btn">Удалить</button>
    `;
    
    const cpu = cartList.find(item => item.category === 'cpu')
    const motherboard = cartList.find(item => item.category === 'motherboard')
    const ram = cartList.find(item => item.category === 'ram')
    const gpu = cartList.find(item => item.category === 'gpu')
    const storage = cartList.find(item => item.category === 'storage')
    const psu = cartList.find(item => item.category === 'psu')
    const casePc = cartList.find(item => item.category === 'case')
    const cooler = cartList.find(item => item.category === 'cooler')

    if(cpu && motherboard && cpu.socket !== motherboard.socket){
        showError('У')
        cartList = cartList.filter(function(cartItem){
            return cartItem.model !== component.model
        }) // удаление товара из массива корзины
        changeCartTotalPrice()
        changeCartPower()
        componentsFilter()

        item.remove()
    }else{
        cart.appendChild(item);
    }

                
        
    if(newCartList.length > 1){
        showError('Only 1 component from each category')
        deleteCart(component)
        item.remove()
    } 
    else if(cpu && motherboard && cpu.socket !== motherboard.socket){
        showError('Motherboard doesn`t support selected CPU')
        deleteCart(component)

        item.remove()
        
    }
    else if(ram && motherboard && ram.ram_type !== motherboard.ram_type){
        showError('Motherboard doesn`t support selected RAM')
        deleteCart(component)

        item.remove()
    }
    else if(casePc && motherboard && !(casePc.supports_form_factors.includes(motherboard.form_factor))){
        showError('Case doesn`t support selected Motherboard')
        deleteCart(component)

        item.remove()
    }
    else if(casePc && gpu && casePc.max_gpu_length_mm < gpu.length_mm){
        showError('Too long GPU fro case, try smaller')
        deleteCart(component)

        item.remove()
    }
    else if(casePc && cooler && casePc.max_cpu_cooler_mm < cooler.height_mm){
        showError('Too hight Cooler for case, try smaller')
        deleteCart(component)

        item.remove()
    }
    else if(cooler && cpu && !(cooler.supported_sockets.includes(cpu.socket))){
        showError('Cooler can`t be attached to CPU')
        deleteCart(component)

        item.remove()
    }
    else{
        
        cart.appendChild(item);
    }
    
    

        

    
    let btn_rem = item.querySelector('.remove-btn')
    

    btn_rem.addEventListener('click', function(){
        cartList = cartList.filter(function(cartItem){
            return cartItem.model !== component.model
        }) // удаление товара из массива корзины
        changeCartTotalPrice()
        changeCartPower()
        componentsFilter()

        item.remove()
    })
    
    
}

btm_rem_all.addEventListener('click', function(){
            cartList = []
            changeCartTotalPrice()
            changeCartPower()
            componentsFilter()
            cart.innerHTML = ''
        })

function deleteCart(component){
    cartList = cartList.filter(function(cartItem){
        return cartItem.model !== component.model
    }) // удаление товара из массива корзины
    changeCartTotalPrice()
    changeCartPower()
    componentsFilter()
}

function showError(text){
    // убираем предыдущую ошибку и её таймер
    if(errorEl){
        errorEl.remove()
        clearTimeout(errorTimer)
    }
    errorEl = document.createElement('div')
    errorEl.classList.add('error-toast')
    errorEl.textContent = text
    document.body.append(errorEl)

    errorTimer = setTimeout(() => {
        errorEl.remove()
        errorEl = null
    }, 5000)
}

function componentsFilter(){
    
    if (cartList.length > 0) {
            const cartModels = cartList.map(function(cartItem) {
                return cartItem.model
            }) // массив строк моделей корзины
            const componetsFiltered = componetsData[currentCategory].filter(function (componentItem) {
                return !(cartModels.includes(componentItem.model)) // проверяем, что модель товара не находится в корзине
            }) // массив карточек товаров, которых нет в корзине
            
            renderComponents(componetsFiltered, currentCategory) // перерисовываем карточки по выбранной категории, которых нет в корзине
        } else {
            renderComponents(componetsData[currentCategory], currentCategory)
        }

}
// value может быть и + и -
function changeCartPower() {
    cartPower = 0
    for(let i = 0; i < cartList.length; i++){
        if(cartList[i].wattage_w){
            cartPower -= cartList[i].wattage_w
        }
        else{cartPower += cartList[i].power_draw_w  }
        
    }
    power.innerHTML = cartPower + 'W'
    //cartPower += value
    // перерисовка в html 
}

// value может быть и + и -
function changeCartTotalPrice() {
    cartTotalPrice = 0
    for(let i = 0; i < cartList.length; i++){
        cartTotalPrice += cartList[i].price_eur
    }
    price.innerHTML = cartTotalPrice + "$"
}

loadComponents();
navigation();