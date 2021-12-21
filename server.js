const pupeeter = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = require('node-fetch');
pupeeter.use(StealthPlugin());

const arraySellersAuthorized = [
	'Americanas',
	'Amazon',
	'Submarino'
]
const analyse = async () => {
	var title2days = [];
	var titleParsed = [];

	await fetch('http://165.227.70.236:5000/listTitle')
		.then(res => res.text())
		.then(body => {
			title2days = JSON.parse(body);
		});

	for (const key of title2days) {
		titleParsed.push(key.descricao)
	}

	const browser = await pupeeter.launch({
		headless: true,
		args: [
			'--disable-gpu',
			'--disable-dev-shm-usage',
			'--disable-setuid-sandbox',
			'--no-first-run',
			'--no-sandbox',
			'--no-zygote',
			'--single-process',
			'--ignore-certificate-errors',
			'--ignore-certificate-errors-spki-list',
			'--enable-features=NetworkService'
		]	
	})

	const page = await browser.newPage();

	await page.setViewport({ width: 1366, height: 768 });
	await page.goto('https://www.gatry.com.br');

	const aElementsWithHi = await page.$x("//a[text()='Carregar mais...']");
	for (let index = 0; index < 1; index++) {
		await page.waitForTimeout(2000);
		await aElementsWithHi[0].click();
	}

	const urlsImages = await page.$$eval('article > div > a > img', (el) => {
		return el.map((a) => a.getAttribute('src'));
	});
	const urlsOrigins = await page.$$eval('.imagem > a', (el) => {
		return el.map((a) => a.getAttribute('href'));
	});
	const texts = await page.$$eval('.informacoes > h3 > a',divs => divs.map(({ innerText }) => innerText));
	const prices = await page.$$eval('.informacoes .preco span[itemprop="price"]',divs => divs.map(({ innerText }) => innerText));
	const lojas = await page.$$eval('.link_loja',divs => divs.map(({ innerText }) => innerText));
	const firstComment = await page.$$eval('.informacoes .preco.comentario',divs => divs.map(({ innerText }) => innerText || 'Não'));
	var comments = [];
	if (firstComment.length == prices.length) {
		comments = firstComment;
	}

	await page.close();
	await browser.disconnect();

	var object = [];

	for (const key in urlsImages) {
		var nomeLoja = lojas[key].substr(8);
		if(arraySellersAuthorized.includes(nomeLoja) && !titleParsed.includes(texts[key])) {
			if(urlsOrigins[key].length <= 25) {
				await fetch('https://unshorten.me/s/' + urlsOrigins[key])
				.then(res => res.text())
				.then(body => {
					if (!body) {
						return;
					}
					object.push({
						'imagem': urlsImages[key],
						'url_original': body,
						'descricao': texts[key],
						'loja': nomeLoja,
						'preco': prices[key],
						'comment': comments[key] || ''
					});}
				);
			} else {
				object.push({
					'imagem': urlsImages[key],
					'url_original': urlsOrigins[key],
					'descricao': texts[key],
					'loja': nomeLoja,
					'preco': prices[key],
					'comment': comments[key] || ''
				})
			}
		}
	}

	for (const key of object) {
		// Awin
		if (key['url_original'].match('ued=(.*)') && key['url_original'].match('ued=(.*)')[1]) {
			key['url_original'] = key['url_original'].match('ued=(.*)')[1];
			key['url_monetizada'] = 'https://redir.lomadee.com/v2/deeplink?url=' + decodeURIComponent(key['url_original'].match('ued=(.*)')[1]) + '&sourceId=37147718';
		} else if (key['url_original'].match('[^?]*')[0]) {
			key['url_original'] = key['url_original'].match('[^?]*')[0]
			key['url_monetizada'] = 'https://redir.lomadee.com/v2/deeplink?url=' + key['url_original'] + '&sourceId=37147718';
		}
	}

	var token = '';
	await fetch('http://165.227.70.236:5000/sessions', {
		'method': 'POST',
		'headers': {
		'Accept': 'application/json',
		'Content-Type': 'application/json'
		},
		'body': JSON.stringify({
			"email": "lenonsdp@gmail.com",
			"password": "teste"
		})
	})
	.then(res => res.text())
	.then(body => {
		data = JSON.parse(body);
		token = data.token;
	});

	await fetch('http://165.227.70.236:5000/promocoes', { 
		'method': 'post', 
		'headers': {
			'Authorization': 'Bearer '+ token, 
			'Content-Type': 'application/json'
		}, 
		'body': JSON.stringify(object)
	});
}

analyse();
