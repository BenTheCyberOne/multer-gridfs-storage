import test from 'ava';
import express from 'express';
import request from 'supertest';
import multer from 'multer';

import {files, cleanStorage} from './utils/testutils';
import {generateUrl} from './utils/settings';
import GridFsStorage from '../index';

test('handling empty name values', async t => {
  const url = generateUrl();
  const app = express();
  const values = [null, undefined, {}];
  let counter = -1;
  let result = {};

  const storage = new GridFsStorage({
    url,
    file: () => {
      counter++;
      return values[counter];
    },
  });
  const upload = multer({storage});

  app.post('/empty', upload.array('photo', 3), (req, res) => {
    result = {headers: req.headers, files: req.files, body: req.body};
    res.end();
  });

  await storage.ready();
  await request(app).post('/empty')
    .attach('photo', files[0])
    .attach('photo', files[0])
    .attach('photo', files[0]);

  result.files.forEach((file) => t.regex(file.filename, /^[0-9a-f]{32}$/));
  result.files.forEach((file) => t.is(file.metadata, null));
  result.files.forEach((file) => t.is(file.bucketName, 'fs'));
  result.files.forEach((file) => t.is(file.chunkSize, 261120));
});

test('handling primitive values as names', async t => {
  const url = generateUrl();
  const app = express();
  t.context.values = ['name', 10];
  let counter = -1;
  let result = {};

  const storage = new GridFsStorage({
    url,
    file: () => {
      counter++;
      return t.context.values[counter];
    },
  });
  const upload = multer({storage});

  app.post('/values', upload.array('photo', 2), (req, res) => {
    result = {headers: req.headers, files: req.files, body: req.body};
    res.end();
  });

  await storage.ready();
  await request(app).post('/values')
    .attach('photo', files[0])
    .attach('photo', files[0]);

  result.files.forEach((f, idx) => t.is(f.filename, t.context.values[idx].toString()));
  result.files.forEach((file) => t.is(file.metadata, null));
  result.files.forEach((file) => t.is(file.bucketName, 'fs'));
  result.files.forEach((file) => t.is(file.chunkSize, 261120));
});

test.afterEach.always('cleanup', t => cleanStorage(t.context.storage));