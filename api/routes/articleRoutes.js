const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { upload } = require('../utils/multer');


router.post('/articles', upload.single('image'), async (req, res) => {
  const { title, content, references } = req.body

  const allowedMimeTypes = ['image/jpeg']
  //for profile_image
  if (req.file) {
    // Check if the MIME type is allowed
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPEG files are allowed.' });
    }

    const { data: image, error } = await supabase.storage.from('mentalwell-profileimage').upload(`image/${req.file.originalname}`, req.file.buffer, {
      contentType: req.file.mimetype,
    });

    const { data: publicUrl } = await supabase.storage.from('mentalwell-profileimage').getPublicUrl(`image/${req.file.originalname}`)

    const { data, e } = await supabase.from('articles').upsert([{ title, content, references, image: publicUrl.publicUrl }]);

    const createdArticle = await supabase.from('articles').select('id, image, title, content, references').order('created_at', { ascending: false }).limit(1);

    res.status(201).json({ message: 'article create success', data: { id: createdArticle.data[0].id, image: createdArticle.data[0].image, title: createdArticle.data[0].title, content: createdArticle.data[0].content, references: createdArticle.data[0].references } })
  }

  if (!req.file) {
    const { data, e } = await supabase.from('articles').upsert([{ title, content, references }]);

    const createdArticle = await supabase.from('articles').select('id, title, image, content, references').order('created_at', { ascending: false }).limit(1);
    res.status(201).json({ message: 'article create success', data: { id: createdArticle.data[0].id, image: createdArticle.data[0].image, title: createdArticle.data[0].title, content: createdArticle.data[0].content, references: createdArticle.data[0].references } })
  }
})

router.get('/articles', async (req, res) => {
  const { title } = req.query;

  if (!title) {
    const { data, error } = await supabase.from('articles').select('id, image, title, content, created_at');
    return res.json(data);
  }

  // const { data, error } = await supabase.from('articles').select('id, title, content, created_at').ilike('title', title);
  const { data, error } = await supabase.from('articles').select('id, image, title, content, created_at').ilike('title', `%${title}%`);
  res.json(data);
})

router.get('/articles/:id', async (req, res) => {
  const articleId = req.params.id;
  try {
    const { data, e } = await supabase.from('articles').select('id, image, title, content, references, created_at').eq('id', articleId);

    if (e) throw e;

    res.json(data);
  } catch (e) {
    console.error('Error fetching data from Supabase:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

module.exports = router;