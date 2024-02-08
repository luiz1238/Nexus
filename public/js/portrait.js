{
	const $dice = $('.dice video');
	const dice = $dice[0];
	dice.load();
	const $result = $('.dice .result');
	const $description = $('.dice .description');
	const $modifier = $('.dice .modifier');

	const $avatar = $('#avatar');
	const $background = $('#background');
	const $mainContainer = $('#mainContainer');

	const queue = [];
	let showingDice = false;
	let currentData = null;
	const newResultTimeout = 1000;

	async function onDiceResult(data) {
		if (currentData) return queue.push(data);

		if (!showingDice) {
			showDiceRoll();
			await global.sleep(newResultTimeout);
			onDiceResult(data);
		}

		showDiceResult(data);
		await global.sleep(3000);
		await hideDiceResult();
		await hideDiceRoll();

		const next = queue.shift();
		if (next) {
			showDiceRoll();
			setTimeout(() => onDiceResult(next), newResultTimeout);
		}
	}

	function showDiceRoll() {
		if (showingDice) return;
		dice.currentTime = 0;
		dice.play();
		$dice.addClass('show');
		$mainContainer.addClass('show');
		showingDice = true;
	}

	const diceHideTimeout =
		parseFloat(getComputedStyle(dice).getPropertyValue('transition-duration')) * 1000;

	function hideDiceRoll() {
		return new Promise((resolve) => {
			if (!showingDice) return resolve();
			$dice.removeClass('show');
			setTimeout(() => {
				$mainContainer.removeClass('show');
				showingDice = false;
				currentData = null;
				resolve();
			}, diceHideTimeout);
		});
	}

	function showDiceResult(data) {
		currentData = data;

		const roll = data.results[0].roll;
		const successType = data.results[0].successType;

		if (successType && successType.isCritical) {
			$result.addClass('critical');
			$description.addClass('critical');
			$modifier.addClass('critical');
		}

		$result.text(roll).fadeIn('slow', () => {
			if (!successType) return;

			const desc = successType.isCritical
				? `Crítico ${successType.description}`
				: successType.description;

			if (successType.modifier !== undefined) {
				let mod = successType.modifier;
				if (mod > 0) mod = `+${mod}`;
				else if (mod < 0) mod = `-${Math.abs(mod)}`;
				$modifier.text(mod).fadeIn('slow');
				return $description.text(desc).fadeIn('slow');
			}

			$description.text(desc).fadeIn('slow');
		});
	}

	function hideDiceResult() {
		return new Promise((resolve) => {
			$description.fadeOut('fast', () => $description.text('').removeClass('critical'));
			$modifier.fadeOut('fast', () => $modifier.text('').removeClass('critical'));
			$result.fadeOut('fast', () => {
				$result.text('').removeClass('critical');
				resolve();
			});
		});
	}

	let avatarStateChangeFunc;
	function showAvatar(id = 0) {
		switch (id) {
			case 1:
				id = 0;
				avatarStateChangeFunc = () => {
					$background.addClass('dying');
					$avatar.addClass('unconscious');
				};
				break;
			case 2:
				id = 0;
				avatarStateChangeFunc = () => {
					$background.addClass('weakening');
					$avatar.addClass('unconscious');
				};
				break;
			case 3:
				id = 0;
				avatarStateChangeFunc = () => $avatar.addClass('unconscious');
				break;
		}
		$background.fadeOut('fast');
		$avatar.fadeOut('fast', () =>
			$avatar.attr('src', `/avatar/${id}?playerID=${playerID}&v=${Date.now()}`)
		);
	}

	$avatar.on('load', () => {
		$background.removeClass('dying weakening');
		$avatar.removeClass('unconscious');
		if (avatarStateChangeFunc) {
			avatarStateChangeFunc();
			avatarStateChangeFunc = undefined;
		}
		$background.fadeIn(350);
		$avatar.fadeIn(300);
	});

	const array = $('body').data('status-state');
	let attr = array.find((attr) => attr.value);
	if (!attr) attr = { attribute_status_id: 0 };
	showAvatar(attr.attribute_status_id);

	socket.on('dice roll', showDiceRoll);
	socket.on('dice result', onDiceResult);
}

{
	const attributes = {
		1: $('.health'),
		2: $('.sanity'),
		3: $('.energy'),
	};

	socket.on('attribute changed', (content) => {
		const attributeID = content.attributeID;
		const newValue = content.value;
		const newTotalValue = content.totalValue;
		const visible = content.visible;

		if (visible) {
			let newText = `${newValue}`;
			if (attributeID !== 3) newText += `/${newTotalValue}`;
			attributes[attributeID].text(newText);
		} else {
			let newText = `?`;
			if (attributeID !== 3) newText += `/?`;
			attributes[attributeID].text(newText);
		}
	});
}

socket.on('environment change', (data) => {
	const timeout = 100;
	$('.container.switchable').fadeOut(timeout);
	setTimeout(() => {
		switch (data.mode) {
			case 'idle':
				$('#idleText').fadeIn(timeout);
				break;
			case 'combat':
				$('#combatText').fadeIn(timeout);
				break;
		}
	}, timeout);
});

socket.on('attribute status changed', (content) => {
	const id = content.attrStatusID;

	const stateArray = $(document.body).data('status-state');
	const updatedAttrStatus = stateArray.find((attr) => attr.attribute_status_id === id);
	updatedAttrStatus.value = content.value;

	$(document.body).data('attributes', stateArray);
	for (const state of stateArray) if (state.value) return showAvatar(state.attribute_status_id);
	showAvatar();
});

socket.on('info changed', (content) => {
	const infoID = content.infoID;
	if (infoID == 1) {
		if (content.visible) {
			const value = content.value.toUpperCase() || 'DESCONHECIDO';
			$('.name').text(value);
		} else {
			$('.name').text('???');
		}
	}
});

socket.on('lineage change', (content) => {
	const lineageID = content.lineageID;
	const img = $('#lineage');
	img.data('lineage', lineageID);
	img.prop('hidden', lineageID === undefined);
	img.attr('src', lineageID ? `/assets/lineages/frameless/${lineageID}/1.png` : '');
});

socket.on('lineage node change', (content) => {
	const newIndex = content.index;
	const newLevel = content.level;

	const img = $('#lineage');

	const lineageID = img.data('lineage');
	const oldLevel = img.data('level');

	if (newLevel >= oldLevel) {
		img.attr('src', `/assets/lineages/frameless/${lineageID}/${newIndex}.png`);
		img.data('level', newLevel);
	}
});
