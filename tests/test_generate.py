import app.generation.generate as g

a, error = g.validate_and_gather(1, 2, "SAMPLE", "pdf")
path, error = g.generate_form(a, "pdf", "SAMPLE")

print(path)
print(error)