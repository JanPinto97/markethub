const router = require('express').Router();
const auth = require('../middleware/auth');
const chatCtrl = require('../controllers/assistantController');
const tools = require('../controllers/assistantToolsController');

router.post('/chat', auth, chatCtrl.chat);

router.get('/tools/communities/search', auth, tools.handlers.searchCommunities);
router.get('/tools/communities/:id', auth, tools.handlers.getCommunity);
router.get('/tools/users/search', auth, tools.handlers.searchUsers);
router.get('/tools/users/:username', auth, tools.handlers.getUser);
router.get('/tools/topics/search', auth, tools.handlers.searchTopics);
router.get('/tools/topics/:slug/posts', auth, tools.handlers.getTopicPosts);
router.get('/tools/news/latest', auth, tools.handlers.getLatestNews);
router.get('/tools/calendar', auth, tools.handlers.getCalendar);

module.exports = router;
