const { test, expect } = require('@playwright/test');
const pages = ["index.html","cv.html","research.html","publications.html","projects.html","music.html","about.html","legal.html"];
test('all pages load without page errors and fit mobile viewport', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});
    for (const file of pages) {
      const response = await page.goto('/'+file);
      expect(response.status(), file).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+2);
      expect(overflow, file+' at '+width).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});
test('publications search and filters', async ({page}) => {
  await page.goto('/publications.html');
  await expect(page.locator('#publication-count')).toHaveText('38 of 38 records');
  await page.locator('#publication-query').fill('zzzznotapublication');
  await expect(page.locator('#publication-count')).toHaveText('0 of 38 records');
  await page.locator('#publication-query').clear();
  await page.locator('#publication-kind').selectOption('preprint');
  await expect(page.locator('#publication-count')).not.toHaveText('38 of 38 records');
});
test('home navigation and recordings', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.affiliation')).toContainText('Research Scientist');
  await expect(page.locator('.affiliation')).toContainText('Max Planck Institute for Sustainable Materials');
  await expect(page.locator('.affiliation')).not.toContainText('effective');
  await expect(page.locator('.track')).toHaveCount(17);
  await expect(page.locator('#player + select')).toHaveValue('stop');
  await page.locator('#player + select').selectOption('shuffle');
  await expect(page.locator('#player + select')).toHaveValue('shuffle');
  await page.locator('.nav-cv').click();
  await expect(page.locator('.cv-intro h1')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#name')).toBeVisible();
});
test('projects and galleries', async ({page}) => {
  await page.goto('/projects.html');
  await expect(page.locator('a[href="https://worldmusicscalesatlas.github.io/"]')).toBeVisible();
  await expect(page.locator('.atlas-catalog-stat')).toContainText('283');
  for(const [id,src] of [['globe','atlas-current-globe.png'],['comparison','atlas-current-comparison.png'],['open-span','atlas-current-open-span.png']]){
    await page.locator('label[for="atlas-view-'+id+'"]').click();
    const img=page.locator('img[src="'+src+'"]');
    await expect(img).toBeVisible();
    await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await expect(page.locator('.world-atlas-actions a[href*="comparison=mode-dorian"]')).toBeVisible();
});

test('Reverie retains the existing audio and displays its new artwork', async ({page}) => {
  for(const path of ['/','/music.html']) {
    await page.goto(path);
    const track=page.locator('#delangiz');
    await expect(track).toContainText('Reverie');
    await expect(track).toHaveAttribute('href','delangiz.mp3');
    await expect(track).toHaveAttribute('data-cover','reverie-cover.png');
    await page.evaluate(()=>{HTMLMediaElement.prototype.play=()=>Promise.resolve();});
    await track.click();
    await expect(page.locator('#current-track')).toHaveText('Reverie');
    await expect(page.locator('#track-cover')).toHaveAttribute('src','reverie-cover.png');
    await expect.poll(()=>page.locator('#track-cover').evaluate(el=>el.complete&&el.naturalWidth===2048&&el.naturalHeight===2048)).toBe(true);
    await expect(page.locator('#player')).toHaveAttribute('src', /delangiz\.mp3$/);
  }
});

test('featured performance has a responsive embedded video and one external watch button', async ({page}) => {
  await page.route('https://www.youtube-nocookie.com/**', route=>route.fulfill({contentType:'text/html',body:'<html><body>Embedded video test</body></html>'}));
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    for(const url of ['/','/music.html']){
      await page.goto(url);
      const section=page.locator('.music-feature');
      const video=section.locator('iframe.performance-video');
      await video.scrollIntoViewIfNeeded();
      await expect(video).toBeVisible();
      await expect(video).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/prpls-ZqFvQ');
      await expect(section.locator('a[href="https://youtu.be/prpls-ZqFvQ"]')).toHaveCount(1);
      const b=await video.boundingBox();
      expect(Math.abs(b.width/b.height-16/9)).toBeLessThan(.03);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    }
  }
});
