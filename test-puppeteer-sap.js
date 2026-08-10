import puppeteer from 'puppeteer';
import { createServer } from 'http';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000/workers');
  
  // Wait for login or directly execute JS to bypass
  await page.evaluate(() => {
    localStorage.setItem('erp_auth_user', JSON.stringify({id:'1'}));
  });
  // reload to apply auth
  await page.goto('http://localhost:3000/kharchi');
  await new Promise(r => setTimeout(r, 2000));
  
  const sapInputs = await page.$$('.sap-input');
  if (sapInputs.length > 0) {
     console.log("Found", sapInputs.length, "sap-inputs");
     await sapInputs[0].click();
     await new Promise(r => setTimeout(r, 1000));
     const modal = await page.$('.fixed.inset-0');
     console.log("Modal opened:", !!modal);
     
     // click first row in modal
     const firstRow = await page.$('tbody tr:first-child');
     if(firstRow) {
         console.log("Found row, clicking...");
         await firstRow.click();
     }
  }

  await browser.close();
})();
