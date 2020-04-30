// get a GW2 API key at https://account.arena.net/applications
// the scopes "characters" and "progress" are required

/**
 * @param {string[]} chars
 * @param {string}   apikey
 * @param {string}   lang
 */
function getStoryProgress(chars, apikey, lang){
	lang = lang.toLowerCase();
	lang = ['de', 'en', 'es', 'fr', 'zh'].includes(lang) ? lang : 'en';

	let urls = [
		'https://api.guildwars2.com/v2/stories/seasons?ids=all&lang=' + lang,
		'https://api.guildwars2.com/v2/stories?ids=all&lang=' + lang,
		'https://api.guildwars2.com/v2/quests?ids=all&lang=' + lang,
	];

	// add an URL to the story progress endpoint for each character
	chars.forEach(name => urls.push('https://api.guildwars2.com/v2/characters/' + encodeURIComponent(name) + '/quests?access_token=' + apikey));

	let wikis = {
		de: 'https://wiki-de.guildwars2.com/wiki/',
		en: 'https://wiki.guildwars2.com/wiki/',
		es: 'https://wiki-es.guildwars2.com/wiki/',
		fr: 'https://wiki-fr.guildwars2.com/wiki/',
		zh: '',
	};

	// use Promise.all() to resolve multiple fetch promises
	// https://stackoverflow.com/a/45389777/3185624
	Promise.all(urls.map(url =>
		fetch(url)
			// check the response
			.then(response => {
				//resolve if it's OK
				if(response.ok){
					return Promise.resolve(response);
				}
				// reject the promise on error
				return Promise.reject(new Error(response.statusText));
			})
			// fetch the response data
			.then(response => response.json())
			// catch fetch errors
			.catch(error => console.log('(╯°□°）╯彡┻━┻ ', 'fetch', error.message))
		))
		.then(responses => {
			// assign the responses, spread the quest progress into an extra array
			let [seasons, stories, quests, ...questsDone] = responses;
			let result = document.getElementById('result');
			let seasonStories = {};

			// flatten quest progress (per character) array to get the progress for the whole account
			// filter/unique is unnecessary as we only check if a value is contained
			questsDone.unshift([].concat(...questsDone)); // .filter((e, i, arr) => i === arr.indexOf(e))

			seasons.sort((a, b) => a.order - b.order);

			// create containers for each season
			seasons.forEach(season => {
				let header = document.createElement('div');
				header.innerHTML = season.name;
				header.className = 'season-header';
				result.appendChild(header);

				let body = document.createElement('div');
				body.id = season.id;
				body.className = 'season-body';
				result.appendChild(body);

				// sort the stories by season and order
				stories.forEach(story => {
					if(story.season === season.id){

						if(!seasonStories[season.id]){
							seasonStories[season.id] = [];
						}

						seasonStories[season.id].push(story);
					}
				});

				seasonStories[season.id].sort((a, b) => a.order - b.order);
			});

			// add 2 elements to chars, the first is the quest name column (for convenience),
			// second is combined characters progress
			chars.unshift('', 'all');

			// create containers for each story
			Object.keys(seasonStories).forEach(seasonId => {
				seasonStories[seasonId].forEach(story => {
					let seasonBody = document.getElementById(seasonId);
					let header = document.createElement('div');
					header.innerHTML = story.name;

					if(story.races){
						header.innerHTML += ' (' + story.races.join(', ') + ')';
					}

					header.className = 'story-header';
					seasonBody.appendChild(header);

					let table = document.createElement('table');
					table.id = 'story-' + story.id;
					table.className = 'story-body';

					let tr = document.createElement('tr');

					chars.forEach(char => {
						let th = document.createElement('th');
						th.innerText = char;

						tr.appendChild(th);
					});

					table.appendChild(tr);
					seasonBody.appendChild(table);
				});
			});

			// remove the empty element
			chars.shift();

			// dump the quests into the previously created containers
			quests.forEach(quest => {

				let storyTable = document.getElementById('story-' + quest.story);
				let tr = document.createElement('tr');
				let questName = document.createElement('td');

				questName.innerHTML = '<a href="'+ wikis[lang] + encodeURIComponent(quest.name) +'" target="_blank">' + quest.name + '</a>';
				tr.appendChild(questName);

				chars.forEach((char, i) => {
					let td = document.createElement('td');
					td.className = 'undone';

					if(questsDone[i].includes(quest.id)){
						td.innerText = '✓';
						td.className = 'done';
					}

					tr.appendChild(td);
				});

				storyTable.appendChild(tr);
			});

		});
}

// retrieve the API key from the local storage and fill the form
document.getElementById('apikeyInput').value = localStorage.getItem('gw2-apikey') || '';

// listen to the form (submit)
document.getElementById('apikey').addEventListener('submit', ev => {
	ev.preventDefault();
	ev.stopPropagation();

	let form = new FormData(ev.target);
	let token = form.get('apikey');
	let lang = form.get('lang');

	// fetch the characters associated with the account
	fetch('https://api.guildwars2.com/v2/characters?access_token=' + token)
		.then(response => {

			if(response.ok){
				localStorage.setItem('gw2-apikey', token);
				document.getElementById('result').innerHTML = '';

				return response.json();
			}

			throw new Error(response.statusText);
		})
		.then(json => getStoryProgress(json, token, lang))
		.catch(error => console.log('(╯°□°）╯彡┻━┻ ', 'fetch', error.message));
})