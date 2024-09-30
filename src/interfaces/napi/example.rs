#[napi(js_name = "ExampleClass")]
pub struct ExampleClass {
    test: bool,
}

#[napi]
impl ExampleClass {
    #[napi(constructor)]
    pub fn new() -> Self {
        ExampleClass {
            test: true
        }
    }

    #[napi]
    pub fn toggle(&mut self) -> bool {
        self.test = !self.test;
        self.test
    }
}
