const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const jsonParser = express.json();
const io = require('../server').io;

router.get('/', async (req, res) => {
	const players = await con('player_info')
		.select('player_info.value', 'player_info.player_id')
		.where('player_info.info_id', 1);

	for (const player of players) if (!player.value) player.value = 'Desconhecido';

	res.render('portrait_selection', { players });
});

router.get('/:id', async (req, res) => {
	const playerID = req.params.id;

	const query = await con('player').select('admin').where('player_id', playerID).first();

	if (!query) return res.status(404).send();

	const isAdmin = query.admin;

	if (isAdmin) return res.status(404).send();

	const results = await Promise.all([
		con('player_info')
			.select('value', 'visible')
			.where('player_id', playerID)
			.andWhere('info_id', 1)
			.first(),
		con('player_attribute')
			.select('value', 'max_value', 'extra_value', 'visible')
			.where('player_id', playerID)
			.orderBy('attribute_id')
			.then((attributes) =>
				attributes.map((attr) => ({
					value: attr.value,
					total_value: attr.max_value + attr.extra_value,
					visible: attr.visible,
				}))
			),
		con('player_attribute_status')
			.select('attribute_status_id', 'value')
			.where('player_id', playerID)
			.orderBy('attribute_status_id'),
		con('player_lineage_node')
			.select('lineage_node.index', 'lineage_node.level')
			.join('lineage_node', (builder) =>
				builder
					.on('lineage_node.lineage_id', 'player_lineage_node.lineage_id')
					.on('lineage_node.index', 'player_lineage_node.index')
			)
			.where('player_id', playerID)
			.orderBy('lineage_node.level', 'DESC')
			.orderBy('date_conquered', 'DESC')
			.first(),
		con('player').select('lineage_id').where('player_id', playerID).first(),
		con('config').select('value').where('key', 'portrait_environment').first(),
	]);

	res.render('portrait', {
		playerID,
		info: results[0],
		attributes: results[1],
		statusState: JSON.stringify(results[2]),
		player: results[3],
		playerLineageID: results[4].lineage_id,
		onCombat: results[5].value === 'combat',
	});
});

router.post('/environment', jsonParser, async (req, res) => {
	const environment = req.body.combat ? 'combat' : 'idle';
	let portraitRooms = io;

	try {
		const players = await con('player').select('player_id');

		for (let i = 0; i < players.length; i++)
			portraitRooms = portraitRooms.to(`portrait${players[i].player_id}`);

		await con('config').update('value', environment).where('key', 'portrait_environment');

		portraitRooms.emit('environment change', { mode: environment });
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

module.exports = router;
