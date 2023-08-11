using TgBackend.Model;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapPost("/addUrl", async (AddUrlRequest dto) =>
{
    //await
    EmbassyRecord embReccord;
    try
    {
        embReccord = new EmbassyRecord(dto.Url ?? string.Empty);

    }
    catch (ArgumentException e)
    {
        return Results.BadRequest(e.Message);
    }

    return Results.Ok(embReccord);
});

app.Run();
